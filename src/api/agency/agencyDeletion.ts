import { agencyDeletionPreviewEndpoint, agencyEndpointBase } from '../../appConfig';
import { FETCH_ERRORS, FETCH_METHODS, FETCH_SUCCESS, fetchData } from '../fetchData';

/** What deleting a counselling centre takes with it, as UserService counts it (ORISO-Admin#1524). */
export interface AgencyDeletionPreview {
    /** Advice seekers whose only counselling centre this is; deleted with it. */
    adviceSeekers: number;
    /** Sessions here of advice seekers who keep their account; purged at night. */
    keptAdviceSeekerSessions: number;
    /** Enquiries nobody has taken yet; closed at once. */
    openEnquiries: number;
    /** Counsellors whose only counselling centre this is; deleted with it. */
    consultantsDeleted: number;
    /** Counsellors who keep their account and only lose this counselling centre. */
    consultantsUnassigned: number;
    /** Agency admins who lose their assignment. */
    agencyAdmins: number;
    /** Active group chats; stopped at once. */
    groupChats: number;
}

export type AgencyDeletionFailureKind =
    | 'INVITES'
    | 'ENQUIRIES'
    | 'ADVICE_SEEKER'
    | 'SESSIONS'
    | 'MEMBERSHIPS'
    | 'CONSULTANT'
    | 'CONSULTANT_RELATION'
    | 'AGENCY_ADMIN'
    | 'GROUP_CHAT';

export interface AgencyDeletionFailure {
    kind: AgencyDeletionFailureKind;
    /** The child that could not be handled; absent when its kind could not be read. */
    id?: string;
    /** Exception type or X-Reason; never personal data. */
    reason: string;
}

export interface AgencyDeletionResult extends AgencyDeletionPreview {
    /** True when everything of the counselling centre is now marked, closed or gone. */
    complete: boolean;
    /** Invitations revoked and invite links switched off. */
    invites: number;
    failures: AgencyDeletionFailure[];
}

export type AgencyDeletionOutcome =
    | { result: 'deleted'; details: AgencyDeletionResult }
    /** The centre is offline and marked, but UserService could not be reached: deleting again repeats the rest. */
    | { result: 'markedOnly' }
    | { result: 'forbidden' }
    | { result: 'notFound' }
    | { result: 'failed'; status?: number };

/** Throws on failure; the dialog shows the cause and offers no deletion without a preview. */
export const getAgencyDeletionPreview = (agencyId: string | number): Promise<AgencyDeletionPreview> =>
    fetchData({
        url: agencyDeletionPreviewEndpoint(agencyId),
        method: FETCH_METHODS.GET,
        skipAuth: false,
        responseHandling: [FETCH_ERRORS.FORBIDDEN_SILENT, FETCH_ERRORS.CATCH_ALL_SILENT],
    });

/**
 * Deletes a counselling centre with what belongs to it. AgencyService takes it offline and marks
 * it, then has UserService delete its accounts, close its enquiries, revoke its invitations and
 * stop its group chats. Never throws: every answer becomes an outcome the dialog can show.
 */
export const deleteAgency = async (agencyId: string | number): Promise<AgencyDeletionOutcome> => {
    try {
        const details: AgencyDeletionResult = await fetchData({
            url: `${agencyEndpointBase}/${agencyId}`,
            method: FETCH_METHODS.DELETE,
            skipAuth: false,
            responseHandling: [
                FETCH_SUCCESS.CONTENT,
                FETCH_ERRORS.NO_MATCH,
                FETCH_ERRORS.FORBIDDEN_SILENT,
                FETCH_ERRORS.SERVICE_UNAVAILABLE,
                FETCH_ERRORS.CATCH_ALL_SILENT,
            ],
        });
        return { result: 'deleted', details: { ...details, failures: details?.failures ?? [] } };
    } catch (error) {
        if (error instanceof Response) return { result: 'failed', status: error.status };
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
