import { agencyEventTypes } from '../../appConfig';

import { FETCH_ERRORS, FETCH_METHODS, fetchData } from '../fetchData';

/**
 * retrieve all needed agency event type data
 * @return {Promise}
 */
const getAgencyEventTypes = (agencyId: string) => {
    return fetchData({
        url: agencyEventTypes(agencyId),
        method: FETCH_METHODS.GET,
        skipAuth: false,
        responseHandling: [FETCH_ERRORS.CATCH_ALL],
    });
};

export default getAgencyEventTypes;
