import { adviceSeekerAdminEndpoint } from '../../appConfig';
import type { UserSearchFilters } from '../../utils/userSearchFilters';
import { FETCH_ERRORS, FETCH_METHODS, fetchData } from '../fetchData';

/** One advice seeker as GET /useradmin/askers returns it. */
export interface AdviceSeekerData {
    id: string;
    username: string;
    tenantId?: number;
    agencyIds: number[];
    /** ISO-8601, UTC, no offset. */
    createDate?: string;
    /** When the advice seeker was marked for deletion; absent while active. */
    deleteDate?: string;
    /** ACTIVE, READ_ONLY_SAFEGUARD, HARD_DELETE_PARTIAL_FAILURE, … */
    deletionState: string;
    /** Why the last nightly run kept the entry: failed stores with their reasons. */
    deletionFailureReason?: string;
    /** ISO-8601, UTC, no offset. */
    deletionFailedAt?: string;
    /** A group-chat system account that owns a Träger's group chats, not a person. */
    technical?: boolean;
    /** False when the server would refuse marking it now (technical account of an existing Träger). */
    deletable?: boolean;
}

export interface AdviceSeekerPage {
    total: number;
    data: AdviceSeekerData[];
}

export interface AdviceSeekerQuery {
    page: number;
    perPage: number;
    /** Whole username: the server stores usernames encoded and cannot match a part of one. */
    username?: string;
    filters: UserSearchFilters;
}

export const getAdviceSeekers = async ({ page, perPage, username, filters }: AdviceSeekerQuery) => {
    const params = new URLSearchParams({ page: String(page), perPage: String(perPage) });
    const trimmed = username?.trim();
    if (trimmed) params.set('username', trimmed);
    if (filters.tenantId) params.set('tenantId', filters.tenantId);
    if (filters.agencyIds?.length) params.set('agencyId', filters.agencyIds.join(','));

    const response: { total?: number; _embedded?: AdviceSeekerData[] } | undefined = await fetchData({
        url: `${adviceSeekerAdminEndpoint}?${params.toString()}`,
        method: FETCH_METHODS.GET,
        skipAuth: false,
        responseHandling: [FETCH_ERRORS.FORBIDDEN, FETCH_ERRORS.CATCH_ALL],
    });

    const { total = 0, _embedded: data = [] } = response ?? {};
    return { total, data } as AdviceSeekerPage;
};

export type AdviceSeekerDeletionResult =
    | 'marked'
    | 'alreadyMarked'
    | 'technicalAccount'
    | 'notFound'
    | 'forbidden'
    | 'failed';

/** X-Reason of the 409 for a group-chat system account whose Träger still exists. */
export const TECHNICAL_ACCOUNT_OF_EXISTING_TENANT = 'TECHNICAL_ACCOUNT_OF_EXISTING_TENANT';

export interface AdviceSeekerDeletionOutcome {
    id: string;
    result: AdviceSeekerDeletionResult;
    /** The server's X-Reason, when it gave one. */
    reason?: string;
    status?: number;
}

/**
 * Marks one advice seeker for deletion. The login is blocked at once; the nightly job deletes the
 * account everywhere. Never throws: every answer becomes an outcome the dialog can show.
 */
export const deleteAdviceSeeker = async (id: string): Promise<AdviceSeekerDeletionOutcome> => {
    try {
        await fetchData({
            url: `${adviceSeekerAdminEndpoint}/${encodeURIComponent(id)}`,
            method: FETCH_METHODS.DELETE,
            skipAuth: false,
            responseHandling: [
                FETCH_ERRORS.CONFLICT_WITH_RESPONSE,
                FETCH_ERRORS.NO_MATCH,
                FETCH_ERRORS.FORBIDDEN_SILENT,
                FETCH_ERRORS.CATCH_ALL_SILENT,
            ],
        });
        return { id, result: 'marked' };
    } catch (error) {
        if (error instanceof Response) {
            const reason = error.headers.get(FETCH_ERRORS.X_REASON) ?? undefined;
            if (error.status === 409) {
                return {
                    id,
                    result: reason === TECHNICAL_ACCOUNT_OF_EXISTING_TENANT ? 'technicalAccount' : 'alreadyMarked',
                };
            }
            return { id, result: 'failed', status: error.status, ...(reason ? { reason } : {}) };
        }
        switch ((error as Error)?.message) {
            case FETCH_ERRORS.NO_MATCH:
                return { id, result: 'notFound' };
            case FETCH_ERRORS.NOT_ALLOWED:
                return { id, result: 'forbidden' };
            default:
                return { id, result: 'failed' };
        }
    }
};

/** One after the other, so a large selection does not hit the server all at once. */
export const deleteAdviceSeekers = (ids: string[]): Promise<AdviceSeekerDeletionOutcome[]> =>
    ids.reduce<Promise<AdviceSeekerDeletionOutcome[]>>(
        async (previous, id) => [...(await previous), await deleteAdviceSeeker(id)],
        Promise.resolve([]),
    );
