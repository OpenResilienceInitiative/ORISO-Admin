import { topicEndpoint } from '../../appConfig';

import { FETCH_ERRORS, FETCH_METHODS, fetchData } from '../fetchData';

/**
 * retrieve all needed agency data
 * @return {Promise}
 */
const getTopicByTenantData = () => {
    return fetchData({
        url: `${topicEndpoint}`,
        method: FETCH_METHODS.GET,
        skipAuth: false,
        responseHandling: [FETCH_ERRORS.CATCH_ALL],
    });
};

export default getTopicByTenantData;
