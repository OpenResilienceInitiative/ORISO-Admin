import { QueryOptions, useQuery, UseQueryOptions } from 'react-query';
import { fetchData, FETCH_METHODS } from '../api/fetchData';
import { tenantAdminsSearchEndpoint } from '../appConfig';
import { CounselorData } from '../types/counselor';
import { HalResponseList, ResponseList } from '../types/ResponseList';
import removeEmbedded from '../utils/removeEmbedded';

interface TenantUserAdminDataProps extends UseQueryOptions<ResponseList<CounselorData>> {
    search?: string;
    current?: number;
    sortBy?: string;
    order?: string;
    pageSize?: number;
}

const DEFAULT_SORT = 'FIRSTNAME';
const DEFAULT_ORDER = 'ASC';

export const useTenantAdminsData = ({
    search,
    current,
    sortBy,
    order,
    pageSize,
    ...options
}: TenantUserAdminDataProps = {}) => {
    return useQuery(
        ['TENANT_ADMINS', search, current, sortBy, order, pageSize],
        () => {
            return fetchData({
                url: `${tenantAdminsSearchEndpoint}?query=${encodeURIComponent(search || '*')}&page=${
                    current || 1
                }&perPage=${pageSize || 10}&order=${order || DEFAULT_ORDER}&field=${sortBy || DEFAULT_SORT}`,
                method: FETCH_METHODS.GET,
                skipAuth: false,
                responseHandling: [],
            }).then((result: HalResponseList<CounselorData>) => removeEmbedded(result) as ResponseList<CounselorData>);
        },
        options as QueryOptions<ResponseList<CounselorData>>,
    );
};
