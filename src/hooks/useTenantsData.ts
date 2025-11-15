import { useQuery, UseQueryOptions } from 'react-query';
import { fetchData, FETCH_ERRORS, FETCH_METHODS } from '../api/fetchData';
import { tenantAdminEndpoint } from '../appConfig';
import { HalResponse, ResponseList } from '../types/ResponseList';
import { TenantAdminData } from '../types/TenantAdminData';
import removeEmbedded from '../utils/removeEmbedded';

interface TenantsProps extends UseQueryOptions<ResponseList<TenantAdminData>> {
    search?: string;
    perPage?: number;
    page?: number;
    sort?: string;
    dir?: string;
}

export const useTenantsData = ({
    page,
    search,
    perPage = 10,
    sort = 'NAME',
    dir = 'ASC',
    ...options
}: TenantsProps) => {
    return useQuery<ResponseList<TenantAdminData>>(
        ['TENANTS', page, perPage, search, sort, dir],
        () => {
            return fetchData({
                url: `${tenantAdminEndpoint}/search?page=${page || 1}&perPage=${perPage}&query=${
                    search || ''
                }&field=${sort}&order=${dir}`,
                method: FETCH_METHODS.GET,
                skipAuth: false,
                responseHandling: [FETCH_ERRORS.CATCH_ALL],
            }).then((v: HalResponse<TenantAdminData>) => removeEmbedded(v) as ResponseList<TenantAdminData>);
        },
        options,
    );
};
