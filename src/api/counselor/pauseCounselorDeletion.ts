import { FETCH_ERRORS, FETCH_METHODS, fetchData } from '../fetchData';
import { counselorEndpoint } from '../../appConfig';

export interface PauseCounselorDeletionInput {
    reason: string;
    /** 1 to 12; the service rejects anything else with 400. */
    months: number;
}

/** Postpones the final deletion of a consultant that is within its safeguard window. */
export const pauseCounselorDeletion = (consultantId: string, { reason, months }: PauseCounselorDeletionInput) =>
    fetchData({
        url: `${counselorEndpoint}/${consultantId}/deletion/pause`,
        method: FETCH_METHODS.POST,
        bodyData: JSON.stringify({ reason: reason.trim(), months }),
        skipAuth: false,
        responseHandling: [
            FETCH_ERRORS.CONFLICT_WITH_RESPONSE,
            FETCH_ERRORS.BAD_REQUEST_WITH_RESPONSE,
            FETCH_ERRORS.FORBIDDEN,
            FETCH_ERRORS.CATCH_ALL,
        ],
    });
