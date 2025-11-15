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
        role: DEFAULT_ROLE,
    }));

    return fetchData({
        url: `${counselorEndpoint}/${counselorId}/agencies`,
        method: FETCH_METHODS.PUT,
        skipAuth: false,
        responseHandling: [FETCH_ERRORS.CATCH_ALL],
        bodyData: JSON.stringify(agencies),
    });
};
