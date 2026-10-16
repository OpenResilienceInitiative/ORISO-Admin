import { counselorEndpoint } from '../../appConfig';
import { FETCH_ERRORS, FETCH_METHODS, FETCH_SUCCESS, fetchData, X_REASON } from '../fetchData';
import { DEFAULT_ROLE } from '../agency/putAgenciesForCounselor';

/**
 * Every way `PUT /useradmin/consultants/{id}/tenant` (ORISO-UserService#1421) can say no, plus the
 * two ways it can fail to answer. The dialog keys one message on each, so a refusal is never
 * reduced to "something went wrong".
 */
export const CHANGE_TENANT_ERRORS = {
    /** 400: the platform runs without multi-tenancy. */
    MULTI_TENANCY_OFF: 'MULTI_TENANCY_OFF',
    /** 400: the counsellor already belongs to the chosen Träger. */
    SAME_TRAEGER: 'SAME_TRAEGER',
    /** 400: a chosen centre belongs to another Träger. */
    CENTRE_OF_OTHER_TRAEGER: 'CENTRE_OF_OTHER_TRAEGER',
    /** 400: the chosen centres do not cover the chosen topics. */
    TOPICS_NOT_COVERED: 'TOPICS_NOT_COVERED',
    /** 400 the server gave no reason for. */
    BAD_REQUEST: 'BAD_REQUEST',
    /** 403: not a platform admin. */
    FORBIDDEN: 'FORBIDDEN',
    /** 404: the counsellor does not exist (any more). */
    NOT_FOUND: 'NOT_FOUND',
    /** 409: the counsellor is the last one of a centre of the old Träger that is still active. */
    LAST_COUNSELLOR_OF_CENTRE: 'LAST_COUNSELLOR_OF_CENTRE',
    /** 409: the account also holds an admin identity, which cannot move with it. */
    ALSO_ADMIN: 'ALSO_ADMIN',
    /** 409 the server gave no reason for. */
    CONFLICT: 'CONFLICT',
    /** 503: Keycloak refused, so nothing was changed. */
    IDENTITY_PROVIDER_UNAVAILABLE: 'IDENTITY_PROVIDER_UNAVAILABLE',
    /** 401 after the token refresh also failed. */
    SESSION_EXPIRED: 'SESSION_EXPIRED',
    /** No answer at all: offline or timed out. The move may or may not have happened. */
    NETWORK: 'NETWORK',
    UNKNOWN: 'UNKNOWN',
} as const;

export type ChangeTenantErrorCode = (typeof CHANGE_TENANT_ERRORS)[keyof typeof CHANGE_TENANT_ERRORS];

export class ChangeConsultantTenantError extends Error {
    readonly code: ChangeTenantErrorCode;

    constructor(code: ChangeTenantErrorCode) {
        super(code);
        this.name = 'ChangeConsultantTenantError';
        this.code = code;
        Object.setPrototypeOf(this, ChangeConsultantTenantError.prototype);
    }
}

export interface ChangeConsultantTenantInput {
    /** The Träger the counsellor moves to. */
    tenantId: string | number;
    /** Centres of that Träger, at least one. */
    centreIds: Array<string | number>;
    /** Left out when the admin was shown no topic picker: the move then starts without topics. */
    topicIds?: Array<string | number>;
}

/** `ConsultantTenantChangeResultDTO`. */
export interface ChangeConsultantTenantResult {
    consultantId: string;
    previousTenantId: number;
    tenantId: number;
    agencyIds: number[];
    /** Open cases that stay with the old Träger until a colleague takes them over. */
    casesLeftWithPreviousTenant: number;
    matrixAccessRevocationsQueued: number;
}

/**
 * The server states the reason of a refusal in the response text only (no machine-readable
 * reason for the 400s), so the variants are told apart by what the message says. Anything that
 * matches nothing keeps its status-level meaning.
 */
const readText = async (response: Response): Promise<string> => {
    try {
        const text = await response.clone().text();
        try {
            const body = JSON.parse(text);
            return [body?.message, body?.error, body?.reason, text]
                .filter((part) => typeof part === 'string')
                .join(' ');
        } catch {
            return text;
        }
    } catch {
        return '';
    }
};

const classifyBadRequest = (text: string): ChangeTenantErrorCode => {
    if (/multi-?tenancy/i.test(text)) {
        return CHANGE_TENANT_ERRORS.MULTI_TENANCY_OFF;
    }
    if (/already belongs/i.test(text)) {
        return CHANGE_TENANT_ERRORS.SAME_TRAEGER;
    }
    if (/topic/i.test(text)) {
        return CHANGE_TENANT_ERRORS.TOPICS_NOT_COVERED;
    }
    if (/belong|tenant|agenc/i.test(text)) {
        return CHANGE_TENANT_ERRORS.CENTRE_OF_OTHER_TRAEGER;
    }
    return CHANGE_TENANT_ERRORS.BAD_REQUEST;
};

const classifyConflict = (reason: string | null, text: string): ChangeTenantErrorCode => {
    if (/admin identity/i.test(text)) {
        return CHANGE_TENANT_ERRORS.ALSO_ADMIN;
    }
    if (reason === X_REASON.CONSULTANT_IS_THE_LAST_OF_AGENCY_AND_AGENCY_IS_STILL_ACTIVE || /\blast\b/i.test(text)) {
        return CHANGE_TENANT_ERRORS.LAST_COUNSELLOR_OF_CENTRE;
    }
    return CHANGE_TENANT_ERRORS.CONFLICT;
};

const classify = async (failure: unknown): Promise<ChangeTenantErrorCode> => {
    if (failure instanceof Response) {
        switch (failure.status) {
            case 400:
                return classifyBadRequest(await readText(failure));
            case 403:
                return CHANGE_TENANT_ERRORS.FORBIDDEN;
            case 404:
                return CHANGE_TENANT_ERRORS.NOT_FOUND;
            case 409:
                return classifyConflict(failure.headers.get(FETCH_ERRORS.X_REASON), await readText(failure));
            case 503:
                return CHANGE_TENANT_ERRORS.IDENTITY_PROVIDER_UNAVAILABLE;
            default:
                return CHANGE_TENANT_ERRORS.UNKNOWN;
        }
    }
    if (failure instanceof Error) {
        if (failure.message === FETCH_ERRORS.UNAUTHORIZED) {
            return CHANGE_TENANT_ERRORS.SESSION_EXPIRED;
        }
        if (failure instanceof TypeError || failure.message === FETCH_ERRORS.TIMEOUT) {
            return CHANGE_TENANT_ERRORS.NETWORK;
        }
    }
    return CHANGE_TENANT_ERRORS.UNKNOWN;
};

/**
 * Moves a counsellor to another Träger (platform admins only). Open cases stay with the old
 * Träger; the counsellor loses access to them and gets new cases at the new Träger's centres.
 * Rejects with a {@link ChangeConsultantTenantError} whose `code` says why.
 */
export const changeConsultantTenant = async (
    consultantId: string,
    { tenantId, centreIds, topicIds }: ChangeConsultantTenantInput,
): Promise<ChangeConsultantTenantResult> => {
    const body = {
        tenantId: Number(tenantId),
        agencies: centreIds.map((agencyId) => ({ agencyId, roleSetKey: DEFAULT_ROLE })),
        ...(topicIds !== undefined && { topicIds: topicIds.map(Number) }),
    };

    try {
        return await fetchData({
            url: `${counselorEndpoint}/${consultantId}/tenant`,
            method: FETCH_METHODS.PUT,
            skipAuth: false,
            // Raw responses, no toast and no access-denied redirect: the dialog says what happened.
            responseHandling: [
                FETCH_ERRORS.BAD_REQUEST_WITH_RESPONSE,
                FETCH_ERRORS.CONFLICT_WITH_RESPONSE,
                FETCH_ERRORS.FORBIDDEN_WITH_RESPONSE,
                FETCH_ERRORS.CATCH_ALL_SILENT,
                FETCH_SUCCESS.CONTENT,
            ],
            bodyData: JSON.stringify(body),
        });
    } catch (failure) {
        throw new ChangeConsultantTenantError(await classify(failure));
    }
};
