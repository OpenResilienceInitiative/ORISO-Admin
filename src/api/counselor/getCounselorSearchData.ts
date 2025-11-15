import { usersConsultantsSearchEndpoint } from '../../appConfig';

import { FETCH_METHODS, fetchData } from '../fetchData';
import removeEmbedded from '../../utils/removeEmbedded';

export const DEFAULT_SORT = 'FIRSTNAME';
export const DEFAULT_ORDER = 'ASC';

/**
 * retrieve all needed counselor data
 * @return {Promise}
 */
const getCounselorSearchData = (state: TableState, query: string) => {
    const { sortBy }: any = state || DEFAULT_SORT;
    const { order }: any = state || DEFAULT_ORDER;

    let searchQuery = query;

    if (query.length <= 0) searchQuery = '*';

    return fetchData({
        url: `${usersConsultantsSearchEndpoint}?query=${encodeURIComponent(searchQuery)}&page=${
            state.current
        }&perPage=${state?.pageSize}&order=${order}&field=${sortBy}`,
        method: FETCH_METHODS.GET,
        skipAuth: false,
        responseHandling: [],
    }).then((result) => {
        return removeEmbedded(result);
    });
};

export default getCounselorSearchData;
