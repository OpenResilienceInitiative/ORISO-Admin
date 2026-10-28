import { FETCH_ERRORS, FETCH_METHODS, fetchData } from '../fetchData';
import { counselorEndpoint } from '../../appConfig';
import { accountOperationHeaders, type AccountOperationIntent } from '../../utils/accountOperationIntent';
import { settleOwnConsultantIdentityMutation } from '../../utils/settleOwnConsultantIdentityMutation';

/**
 * delete counselor
 * @param counselorDataId
 * @param forceDelete
 * @return data
 */
export const deleteCounselorData = (counselorDataId: string, forceDelete = false, intent?: AccountOperationIntent) => {
    const url = `${counselorEndpoint}/${counselorDataId}?forceDeleteSessions=${forceDelete ? 'true' : 'false'}`;
    const request = {
        url,
        headersData: accountOperationHeaders(intent, FETCH_METHODS.DELETE, url),
        method: FETCH_METHODS.DELETE,
        skipAuth: false,
        responseHandling: [
            FETCH_ERRORS.BAD_REQUEST_WITH_RESPONSE,
            FETCH_ERRORS.FORBIDDEN_WITH_RESPONSE,
            FETCH_ERRORS.CONFLICT_WITH_RESPONSE,
            FETCH_ERRORS.CATCH_ALL_SILENT,
        ],
    };
    return settleOwnConsultantIdentityMutation(counselorDataId, intent, () => fetchData(request), {
        recoverOwnIdentity: true,
        renewOwnSuccess: true,
    });
};
