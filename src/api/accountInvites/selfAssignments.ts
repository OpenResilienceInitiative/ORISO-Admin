import { selfAssignmentsEndpoint } from '../../appConfig';
import { FETCH_ERRORS, FETCH_METHODS, fetchData } from '../fetchData';

/** Roles an admin may take on themselves in an agency (#1026 slice 3). */
export type SelfAssignmentRole = 'COUNSELLOR';

export interface SelfAssignmentRequest {
    role: SelfAssignmentRole;
    agencyId: number;
    /** Required by the backend when a counsellor joins an agency with several topics. */
    topicIds?: number[];
}

export interface SelfAssignmentResult {
    role: SelfAssignmentRole;
    agencyId: number;
    userId: string;
    consultantIdentityCreated: boolean;
}

/** The caller's own assignments, as agency ids per role. */
export interface SelfAssignments {
    agencyAdminAgencyIds: number[];
    counsellorAgencyIds: number[];
}

export { selfAssignmentsEndpoint };

/**
 * Assigns the calling admin — their existing account, no e-mail invite
 * (UserService#1215). 400/403/409 reject with the raw Response, so the caller
 * can name the cause (409 `X-Reason: SELF_ASSIGNMENT_ALREADY_EXISTS`).
 */
export const createSelfAssignment = async (body: SelfAssignmentRequest): Promise<SelfAssignmentResult> => {
    const response = await fetchData({
        url: selfAssignmentsEndpoint,
        method: FETCH_METHODS.POST,
        skipAuth: false,
        responseHandling: [
            FETCH_ERRORS.CATCH_ALL,
            FETCH_ERRORS.BAD_REQUEST_WITH_RESPONSE,
            FETCH_ERRORS.NO_MATCH,
            FETCH_ERRORS.CONFLICT_WITH_RESPONSE,
            FETCH_ERRORS.FORBIDDEN_WITH_RESPONSE,
        ],
        bodyData: JSON.stringify({ role: body.role, agencyId: body.agencyId, topicIds: body.topicIds }),
    });
    return response.json();
};

export const listSelfAssignments = async (): Promise<SelfAssignments> =>
    fetchData({
        url: selfAssignmentsEndpoint,
        method: FETCH_METHODS.GET,
        skipAuth: false,
        responseHandling: [FETCH_ERRORS.CATCH_ALL_SILENT],
    });
