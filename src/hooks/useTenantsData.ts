import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { fetchData, FETCH_ERRORS, FETCH_METHODS } from '../api/fetchData';
import { tenantAdminEndpoint } from '../appConfig';
import { HalResponse, ResponseList } from '../types/ResponseList';
import { TenantAdminData } from '../types/TenantAdminData';
import removeEmbedded from '../utils/removeEmbedded';

interface TenantsProps extends Omit<UseQueryOptions<ResponseList<TenantAdminData>>, 'queryKey' | 'queryFn'> {
    search?: string;
    perPage?: number;
    page?: number;
    sort?: string;
    dir?: string;
}

export const TENANTS_QUERY_KEY = 'TENANTS';

export const useTenantsData = ({
    page,
    search,
    perPage = 10,
    sort = 'NAME',
    dir = 'ASC',
    ...options
}: TenantsProps) => {
    return useQuery<ResponseList<TenantAdminData>>({
        queryKey: [TENANTS_QUERY_KEY, page, perPage, search, sort, dir],
        queryFn: () => {
            return fetchData({
                url: `${tenantAdminEndpoint}/search?page=${page || 1}&perPage=${perPage}&query=${
                    search || ''
                }&field=${sort}&order=${dir}`,
                method: FETCH_METHODS.GET,
                skipAuth: false,
                responseHandling: [FETCH_ERRORS.CATCH_ALL],
            }).then((v: HalResponse<TenantAdminData>) => removeEmbedded(v) as ResponseList<TenantAdminData>);
        },
        ...options,
    });
};
