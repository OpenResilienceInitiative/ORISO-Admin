import { topicAdminEndpoint } from '../../appConfig';
import { ResponseList } from '../../types/ResponseList';
import { TopicData } from '../../types/topic';

import { FETCH_ERRORS, FETCH_METHODS, fetchData, FETCH_SUCCESS } from '../fetchData';
// import removeEmbedded from "../../utils/removeEmbedded";

export const DEFAULT_SORT = 'NAME';
export const DEFAULT_ORDER = 'ASC';

/**
 * retrieve all topics for tenant context
 * @return {Promise}
 */
const getTopicData = (params: TableState) => {
    // retrieve Topics

    let sortBy = params.sortBy || DEFAULT_SORT;
    let order = params.order || DEFAULT_ORDER;

    sortBy = sortBy.toUpperCase();
    order = order.toUpperCase();

    return fetchData({
        url: `${topicAdminEndpoint}/?page=${params.current}&perPage=${
            params.pageSize || 10
        }&order=${order}&field=${sortBy}`,
        method: FETCH_METHODS.GET,
        skipAuth: false,
        // A 403 rejects with FORBIDDEN instead of sending the browser to /admin/access-denied:
        // the topics page says the viewer has no access, the rest of the Admin stays usable (#1504).
        responseHandling: [FETCH_SUCCESS.CONTENT, FETCH_ERRORS.FORBIDDEN],
    }).then((result) => {
        const resultArray = result instanceof Array ? result : [];
        return {
            total: resultArray.length,
            data: resultArray,
        } as ResponseList<TopicData>;
    });
};

export default getTopicData;
