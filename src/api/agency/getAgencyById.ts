import { agencyDataAgencyId } from '../../appConfig';

import { FETCH_ERRORS, FETCH_METHODS, fetchData } from '../fetchData';

/**
 * retrieve all data based on agency
 * @return {Promise}
 */
const getAgencyDataById = (agencyId: string) => {
    return fetchData({
        url: agencyDataAgencyId(agencyId),
        method: FETCH_METHODS.GET,
        skipAuth: false,
        responseHandling: [FETCH_ERRORS.CATCH_ALL],
    });
};

export default getAgencyDataById;
