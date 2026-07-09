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
        queryFn: () =>
            fetchUserSearchWithSortFallback({
                url: `${tenantAdminsSearchEndpoint}?query=${encodeURIComponent(search || '*')}&page=${
                    current || 1
                }&perPage=${pageSize || 10}`,
                sortBy: sortBy || USER_TABLE_DEFAULT_SORT,
                order: order || USER_TABLE_DEFAULT_ORDER,
                normalizeSortField: normalizeTenantAdminSortField,
            }),
        ...(options as object),
        retry: false,
        refetchOnMount: 'always',
        refetchOnWindowFocus: false,
    });
};
