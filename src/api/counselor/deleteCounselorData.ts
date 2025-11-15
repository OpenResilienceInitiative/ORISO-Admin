import { FETCH_ERRORS, FETCH_METHODS, fetchData } from '../fetchData';
import { counselorEndpoint } from '../../appConfig';

/**
 * delete counselor
 * @param counselorDataId
 * @param forceDelete
 * @return data
 */
export const deleteCounselorData = (counselorDataId: string, forceDelete = false) =>
    fetchData({
        url: `${counselorEndpoint}/${counselorDataId}?forceDeleteSessions=${forceDelete ? 'true' : 'false'}`,
        method: FETCH_METHODS.DELETE,
        skipAuth: false,
        responseHandling: [FETCH_ERRORS.BAD_REQUEST_WITH_RESPONSE, FETCH_ERRORS.CATCH_ALL],
    });
