import { agencyEndpointBase } from '../../appConfig';

import { FETCH_ERRORS, FETCH_METHODS, fetchData } from '../fetchData';

/**
 * retrieve all needed agency data
 * @return {Promise}
 */
const getAgencyByTenantData = (perPage: number) => {
    return fetchData({
        url: `${agencyEndpointBase}?perPage=${perPage}&page=1`,
        method: FETCH_METHODS.GET,
        skipAuth: false,
        responseHandling: [FETCH_ERRORS.CATCH_ALL],
    });
};

export default getAgencyByTenantData;
