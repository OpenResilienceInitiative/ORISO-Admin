import { agencyEndpointBase } from '../../appConfig';

import { FETCH_METHODS, fetchData } from '../fetchData';
import removeEmbedded from '../../utils/removeEmbedded';
import { AgencyData } from '../../types/agency';
import { ResponseList } from '../../types/ResponseList';

export const DEFAULT_SORT = 'NAME';
export const DEFAULT_ORDER = 'ASC';

/**
 * retrieve all agencies for tenant context
 * @return {Promise}
 */
const getAgencyData = (params: TableState & { search?: string }) => {
    // retrieve Agencies

    let sortBy = params.sortBy || DEFAULT_SORT;
    let order = params.order || DEFAULT_ORDER;

    sortBy = sortBy.toUpperCase();
    order = order.toUpperCase();

    const resolveAgencyStatus = (el: any) => {
        if (el.deleteDate !== 'null') {
            return 'IN_DELETION';
        }
        return 'CREATED';
    };

    const searchQuery = params.search || '*';

    return fetchData({
        url: `${agencyEndpointBase}/?q=${encodeURIComponent(searchQuery)}&page=${params.current || 1}&perPage=${
            params?.pageSize || 10
        }&order=${order}&field=${sortBy}`,
        method: FETCH_METHODS.GET,
        skipAuth: false,
        responseHandling: [],
    })
        .then((result) => {
            // eslint-disable-next-line no-underscore-dangle
            return removeEmbedded(result);
        })
        .then((result) => {
            return {
                total: result.total,
                data: result.data.map((el: any) => {
                    return {
                        ...el,
                        teamAgency: el.teamAgency ? 'true' : 'false',
                        status: resolveAgencyStatus(el),
                        online: !el.offline,
                    };
                }),
            } as ResponseList<AgencyData>;
        });
};

export default getAgencyData;
