import { QueryOptions, useQuery, UseQueryOptions } from 'react-query';
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

interface TenantUserAdminDataProps extends UseQueryOptions<ResponseList<CounselorData>> {
    search?: string;
    current?: number;
    sortBy?: string;
    order?: string;
    pageSize?: number;
}

export const useTenantAdminsData = ({
    search,
    current,
    sortBy,
    order,
    pageSize,
    ...options
}: TenantUserAdminDataProps = {}) => {
    return useQuery(
        [TENANT_ADMINS_QUERY_KEY, search, current, sortBy, order, pageSize],
        () =>
            fetchUserSearchWithSortFallback({
                url: `${tenantAdminsSearchEndpoint}?query=${encodeURIComponent(search || '*')}&page=${
                    current || 1
                }&perPage=${pageSize || 10}`,
                sortBy: sortBy || USER_TABLE_DEFAULT_SORT,
                order: order || USER_TABLE_DEFAULT_ORDER,
                normalizeSortField: normalizeTenantAdminSortField,
            }),
        {
            ...options,
            retry: false,
            refetchOnMount: 'always',
            refetchOnWindowFocus: false,
        } as QueryOptions<ResponseList<CounselorData>>,
    );
};
