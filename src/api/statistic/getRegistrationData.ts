import { registrationDataEndpoint } from '../../appConfig';

import { FETCH_METHODS, fetchData, FETCH_SUCCESS } from '../fetchData';

/**
 * retrieve all registration data for tenant context
 * @return {Promise}
 */
const getRegistrationData = () => {
    return fetchData({
        url: registrationDataEndpoint,
        method: FETCH_METHODS.GET,
        skipAuth: false,
        responseHandling: [FETCH_SUCCESS.CONTENT],
    });
};

export default getRegistrationData;
