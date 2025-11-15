import { topicAdminEndpoint } from '../../appConfig';
import { ResponseList } from '../../types/ResponseList';
import { TopicData } from '../../types/topic';

import { FETCH_METHODS, fetchData, FETCH_SUCCESS } from '../fetchData';
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
        responseHandling: [FETCH_SUCCESS.CONTENT],
    }).then((result) => {
        const resultArray = result instanceof Array ? result : [];
        return {
            total: resultArray.length,
            data: resultArray,
        } as ResponseList<TopicData>;
    });
};

export default getTopicData;
