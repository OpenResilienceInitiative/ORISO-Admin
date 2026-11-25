import { counselorEndpoint } from '../../appConfig';
import { FETCH_ERRORS, FETCH_METHODS, fetchData } from '../fetchData';
import { withUtcInstants } from '../../utils/backendInstant';
import { accountInvitesEndpoint, type AccountInviteDTO } from './accountInvites';

/** Roles an invite may swap between before acceptance; a Träger-level role needs a new invite. */
export type ChangeableInviteRole = 'COUNSELLOR' | 'AGENCY_ADMIN';

export interface ChangeInviteRoleRequest {
    targetRole: ChangeableInviteRole;
    /** AGENCY_ADMIN only; omitted, a promoted counsellor keeps counselling. */
    alsoCounsellor?: boolean;
}

export interface AddConsultantRoleRequest {
    role: 'AGENCY_ADMIN';
    /** May be omitted when the counsellor counsels in exactly one agency. */
    agencyId?: number;
}

export interface AddedConsultantRole {
    consultantId: string;
    role: 'AGENCY_ADMIN';
    /** Every agency the account administers now. */
    agencyIds: number[];
}

// explainInviteError reads the status and X-Reason of each of these (ORISO-UserService#1260).
const ROLE_ERRORS = [
    FETCH_ERRORS.CATCH_ALL,
    FETCH_ERRORS.BAD_REQUEST_WITH_RESPONSE,
    FETCH_ERRORS.FORBIDDEN_WITH_RESPONSE,
    FETCH_ERRORS.NO_MATCH,
    FETCH_ERRORS.CONFLICT_WITH_RESPONSE,
];

/** `PUT /useradmin/account-invites/{id}/role`: only while nobody accepted the invite. */
export const changeAccountInviteRole = async (
    inviteId: number,
    request: ChangeInviteRoleRequest,
): Promise<AccountInviteDTO> => {
    const response = await fetchData({
        url: `${accountInvitesEndpoint}/${inviteId}/role`,
        method: FETCH_METHODS.PUT,
        skipAuth: false,
        responseHandling: ROLE_ERRORS,
        bodyData: JSON.stringify(request),
    });
    return withUtcInstants(await response.json());
};

/** `POST /useradmin/consultants/{id}/roles`: gives an existing account one more role; removal lives in Users. */
export const addConsultantRole = async (
    consultantId: string,
    request: AddConsultantRoleRequest,
): Promise<AddedConsultantRole> => {
    const response = await fetchData({
        url: `${counselorEndpoint}/${encodeURIComponent(consultantId)}/roles`,
        method: FETCH_METHODS.POST,
        skipAuth: false,
        responseHandling: ROLE_ERRORS,
        bodyData: JSON.stringify(request),
    });
    return response.json();
};
