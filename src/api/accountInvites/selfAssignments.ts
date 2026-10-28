import { selfAssignmentsEndpoint } from '../../appConfig';
import { FETCH_ERRORS, FETCH_METHODS, fetchData } from '../fetchData';
import { type AccountOperationIntent, accountOperationHeaders } from '../../utils/accountOperationIntent';
import { getSessionAccessToken } from '../auth/tokenSessionStore';
import parseJwt from '../../utils/parseJWT';
import { settleOwnConsultantIdentityMutation } from '../../utils/settleOwnConsultantIdentityMutation';

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

/** Uses the caller's existing account; 400/403/409 reject with the raw Response so the caller can name the cause. */
export const createSelfAssignment = async (
    body: SelfAssignmentRequest,
    operationIntent?: AccountOperationIntent,
): Promise<SelfAssignmentResult> => {
    const url = selfAssignmentsEndpoint;
    const bodyData = JSON.stringify({ role: body.role, agencyId: body.agencyId, topicIds: body.topicIds });
    const subject = parseJwt(getSessionAccessToken())?.sub;
    return settleOwnConsultantIdentityMutation(
        typeof subject === 'string' ? subject : '',
        operationIntent,
        () =>
            fetchData({
                url,
                headersData: accountOperationHeaders(operationIntent, FETCH_METHODS.POST, url, bodyData),
                method: FETCH_METHODS.POST,
                skipAuth: false,
                responseHandling: [
                    FETCH_ERRORS.CATCH_ALL_SILENT,
                    FETCH_ERRORS.BAD_REQUEST_WITH_RESPONSE,
                    FETCH_ERRORS.NO_MATCH,
                    FETCH_ERRORS.CONFLICT_WITH_RESPONSE,
                    FETCH_ERRORS.FORBIDDEN_WITH_RESPONSE,
                ],
                bodyData,
            }).then((response) => response.json()),
        { recoverOwnIdentity: true, renewOwnSuccess: true },
    );
};

export const listSelfAssignments = async (): Promise<SelfAssignments> =>
    fetchData({
        url: selfAssignmentsEndpoint,
        method: FETCH_METHODS.GET,
        skipAuth: false,
        responseHandling: [FETCH_ERRORS.CATCH_ALL_SILENT],
    });
