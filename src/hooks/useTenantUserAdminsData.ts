import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { tenantAdminsSearchEndpoint } from '../appConfig';
import {
    USER_TABLE_DEFAULT_ORDER,
    USER_TABLE_DEFAULT_SORT,
    normalizeTenantAdminSortField,
} from '../constants/userTableSort';
import { CounselorData } from '../types/counselor';
import { ResponseList } from '../types/ResponseList';
import { fetchUserSearchWithSortFallback } from '../utils/fetchUserSearchWithSortFallback';
import { TENANT_ADMINS_QUERY_KEY } from './useTenantUserAdminData';

// Platform administrators share the tenant-admin API representation but use
// the reserved platform tenant id 0. Fetch the bounded admin set once so the
// client can classify records before calculating page totals.
const TENANT_ADMINS_FETCH_SIZE = 1000;
const PLATFORM_TENANT_ID = '0';

interface TenantUserAdminDataProps extends Omit<UseQueryOptions<ResponseList<CounselorData>>, 'queryKey' | 'queryFn'> {
    search?: string;
    current?: number;
    sortBy?: string;
    order?: string;
    pageSize?: number;
}

export const useTenantAdminsData = (
    { search, current, sortBy, order, pageSize, ...options }: TenantUserAdminDataProps = {} as TenantUserAdminDataProps,
) => {
    return useQuery({
        queryKey: [TENANT_ADMINS_QUERY_KEY, search, current, sortBy, order, pageSize],
        queryFn: async () => {
            const response = await fetchUserSearchWithSortFallback({
                url: `${tenantAdminsSearchEndpoint}?query=${encodeURIComponent(
                    search || '*',
                )}&page=1&perPage=${TENANT_ADMINS_FETCH_SIZE}`,
                sortBy: sortBy || USER_TABLE_DEFAULT_SORT,
                order: order || USER_TABLE_DEFAULT_ORDER,
                normalizeSortField: normalizeTenantAdminSortField,
            });
            const tenantAdmins = (response.data || []).filter(
                (record) => String(record.tenantId) !== PLATFORM_TENANT_ID,
            );
            const page = current || 1;
            const perPage = pageSize || 10;

            return {
                ...response,
                total: tenantAdmins.length,
                data: tenantAdmins.slice((page - 1) * perPage, page * perPage),
            };
        },
        ...(options as object),
        retry: false,
        refetchOnMount: 'always',
        refetchOnWindowFocus: false,
    });
};
