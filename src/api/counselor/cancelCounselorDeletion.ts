import { FETCH_ERRORS, FETCH_METHODS, fetchData } from '../fetchData';
import { counselorEndpoint } from '../../appConfig';

/**
 * Cancels the deletion of a consultant while it is still within its safeguard window. The service
 * answers 409 when the window is over or the account is not being deleted, which the caller
 * turns into its own message — a refused request is not a generic failure.
 */
export const cancelCounselorDeletion = (consultantId: string) =>
    fetchData({
        url: `${counselorEndpoint}/${consultantId}/deletion/cancel`,
        method: FETCH_METHODS.POST,
        skipAuth: false,
        responseHandling: [
            FETCH_ERRORS.CONFLICT_WITH_RESPONSE,
            FETCH_ERRORS.BAD_REQUEST_WITH_RESPONSE,
            FETCH_ERRORS.FORBIDDEN,
            FETCH_ERRORS.CATCH_ALL,
        ],
    });
