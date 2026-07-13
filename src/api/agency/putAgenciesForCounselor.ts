import { counselorEndpoint } from '../../appConfig';

import { FETCH_ERRORS, FETCH_METHODS, fetchData } from '../fetchData';

export const DEFAULT_ROLE = 'CONSULTANT_DEFAULT';

/**
 * retrieve all needed agency data
 * @return {Promise}
 */
export const putAgenciesForCounselor = (counselorId: string, agencyIds: string[]) => {
    const agencies = agencyIds.map((agencyId) => ({
        agencyId,
        roleSetKey: DEFAULT_ROLE,
    }));

    return fetchData({
        url: `${counselorEndpoint}/${counselorId}/agencies`,
        method: FETCH_METHODS.PUT,
        skipAuth: false,
        // Reject with the raw Response (no generic toast) so the caller can surface the
        // backend's specific message — e.g. "topic ids [10] are not covered by ... agencies".
        responseHandling: [FETCH_ERRORS.BAD_REQUEST_WITH_RESPONSE, FETCH_ERRORS.CATCH_ALL_SILENT],
        bodyData: JSON.stringify(agencies),
    });
};
