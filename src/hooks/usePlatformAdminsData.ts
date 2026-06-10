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

export const PLATFORM_ADMINS_QUERY_KEY = 'PLATFORM_ADMINS';

// Platform admins are tenant-admin records with tenantId 0 (MT-04-12). The search
// endpoint has no tenant filter, so fetch a large page and filter + paginate locally —
// the platform-admin group is inherently small.
const PLATFORM_ADMINS_FETCH_SIZE = 100;
const PLATFORM_TENANT_ID = '0';

interface PlatformAdminsDataProps extends UseQueryOptions<ResponseList<CounselorData>> {
    search?: string;
    current?: number;
    sortBy?: string;
    order?: string;
    pageSize?: number;
}

export const usePlatformAdminsData = ({
    search,
    current,
    sortBy,
    order,
    pageSize,
    ...options
}: PlatformAdminsDataProps = {}) => {
    return useQuery(
        [PLATFORM_ADMINS_QUERY_KEY, search, current, sortBy, order, pageSize],
        async () => {
            const response = await fetchUserSearchWithSortFallback({
                url: `${tenantAdminsSearchEndpoint}?query=${encodeURIComponent(
                    search || '*',
                )}&page=1&perPage=${PLATFORM_ADMINS_FETCH_SIZE}`,
                sortBy: sortBy || USER_TABLE_DEFAULT_SORT,
                order: order || USER_TABLE_DEFAULT_ORDER,
                normalizeSortField: normalizeTenantAdminSortField,
            });

            const platformAdmins = (response.data || []).filter(
                (record) => String(record.tenantId) === PLATFORM_TENANT_ID,
            );

            const page = current || 1;
            const perPage = pageSize || 10;

            return {
                ...response,
                total: platformAdmins.length,
                data: platformAdmins.slice((page - 1) * perPage, page * perPage),
            };
        },
        {
            ...options,
            retry: false,
            refetchOnMount: 'always',
            refetchOnWindowFocus: false,
        } as QueryOptions<ResponseList<CounselorData>>,
    );
};
