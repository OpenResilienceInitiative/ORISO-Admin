import { FETCH_ERRORS, FETCH_METHODS, fetchData } from '../fetchData';
import { topicAdminEndpoint } from '../../appConfig';

/**
 * delete topic
 * @param topicData
 * @return Promise
 */
export const deleteTopicData = (id: string | number) => {
    return fetchData({
        url: `${topicAdminEndpoint}/${id}`,
        method: FETCH_METHODS.DELETE,
        skipAuth: false,
        responseHandling: [FETCH_ERRORS.CATCH_ALL],
    });
};
