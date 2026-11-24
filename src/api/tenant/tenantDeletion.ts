import { tenantDeletionPreviewEndpoint, tenantEndpoint } from '../../appConfig';
import { FETCH_ERRORS, FETCH_METHODS, FETCH_SUCCESS, fetchData } from '../fetchData';

/** What a Träger still holds that is not marked for deletion yet, as UserService counts it. */
export interface TenantDeletionPreview {
    agencies: number;
    consultants: number;
    adviceSeekers: number;
    agencyAdmins: number;
    tenantAdmins: number;
    openInvites: number;
}

export type TenantDeletionFailureKind =
    | 'INVITES'
    | 'CONSULTANT'
    | 'ADVICE_SEEKER'
    | 'AGENCY_ADMIN'
    | 'TENANT_ADMIN'
    | 'AGENCY';

export interface TenantDeletionFailure {
    kind: TenantDeletionFailureKind;
    /** The child that could not be handled; absent when its kind could not be read. */
    id?: string;
    /** Exception type; never personal data. */
    reason: string;
}

export interface TenantDeletionResult {
    /** True when everything of the Träger is now marked or gone. */
    complete: boolean;
    invites: number;
    consultants: number;
    adviceSeekers: number;
    agencyAdmins: number;
    tenantAdmins: number;
    agencies: number;
    failures: TenantDeletionFailure[];
}

/** X-Reason TenantService sends for the main tenant of single-domain multitenancy. */
export const MAIN_TENANT_NOT_DELETABLE = 'MAIN_TENANT_NOT_DELETABLE';

export type TenantDeletionOutcome =
    | { result: 'deleted'; details: TenantDeletionResult }
    /** The Träger may already be marked and switched off; deleting it again finishes the rest. */
    | { result: 'markedOnly' }
    | { result: 'mainTenant' }
    | { result: 'forbidden' }
    | { result: 'notFound' }
    | { result: 'failed'; status?: number };

/** Throws on failure; the dialog offers no deletion without a preview. */
export const getTenantDeletionPreview = (tenantId: number): Promise<TenantDeletionPreview> =>
    fetchData({
        url: tenantDeletionPreviewEndpoint(tenantId),
        method: FETCH_METHODS.GET,
        skipAuth: false,
        responseHandling: [FETCH_ERRORS.FORBIDDEN_SILENT, FETCH_ERRORS.CATCH_ALL_SILENT],
    });

/**
 * Deletes a Träger with everything that belongs to it (ORISO-Admin#1525). TenantService marks and
 * switches it off, then UserService marks its Beratungsstellen, accounts and invitations; the
 * nightly jobs remove them, the Träger last. Never throws: every answer becomes an outcome.
 */
export const deleteTenant = async (tenantId: number): Promise<TenantDeletionOutcome> => {
    try {
        const details: TenantDeletionResult = await fetchData({
            url: `${tenantEndpoint}${tenantId}`,
            method: FETCH_METHODS.DELETE,
            skipAuth: false,
            responseHandling: [
                FETCH_SUCCESS.CONTENT,
                FETCH_ERRORS.CONFLICT_WITH_RESPONSE,
                FETCH_ERRORS.NO_MATCH,
                FETCH_ERRORS.FORBIDDEN_SILENT,
                FETCH_ERRORS.SERVICE_UNAVAILABLE,
                FETCH_ERRORS.CATCH_ALL_SILENT,
            ],
        });
        return { result: 'deleted', details: { ...details, failures: details?.failures ?? [] } };
    } catch (error) {
        if (error instanceof Response) {
            if (error.status === 409 && error.headers.get(FETCH_ERRORS.X_REASON) === MAIN_TENANT_NOT_DELETABLE) {
                return { result: 'mainTenant' };
            }
            return { result: 'failed', status: error.status };
        }
        switch ((error as Error)?.message) {
            case FETCH_ERRORS.SERVICE_UNAVAILABLE:
                return { result: 'markedOnly' };
            case FETCH_ERRORS.NOT_ALLOWED:
                return { result: 'forbidden' };
            case FETCH_ERRORS.NO_MATCH:
                return { result: 'notFound' };
            default:
                return { result: 'failed' };
        }
    }
};
