import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { fetchData, FETCH_METHODS } from '../api/fetchData';
import { globalSupportAdminsSearchEndpoint } from '../appConfig';
import { USER_TABLE_DEFAULT_ORDER, USER_TABLE_DEFAULT_SORT } from '../constants/userTableSort';
import { CounselorData } from '../types/counselor';
import { ResponseList } from '../types/ResponseList';

export const GLOBAL_SUPPORT_ADMINS_QUERY_KEY = 'GLOBAL_SUPPORT_ADMINS';

interface GlobalSupportAdminsDataProps
    extends Omit<UseQueryOptions<ResponseList<CounselorData>>, 'queryKey' | 'queryFn'> {
    search?: string;
    current?: number;
    sortBy?: string;
    order?: string;
    pageSize?: number;
}

interface GlobalSupportAdminSearchResponse {
    items: CounselorData[];
    total: number;
}

export const useGlobalSupportAdminsData = ({
    search,
    current,
    sortBy,
    order,
    pageSize,
    ...options
}: GlobalSupportAdminsDataProps = {}) =>
    useQuery({
        queryKey: [GLOBAL_SUPPORT_ADMINS_QUERY_KEY, search, current, sortBy, order, pageSize],
        queryFn: async () => {
            const params = new URLSearchParams({
                query: search || '*',
                page: String(current || 1),
                perPage: String(pageSize || 10),
                field: sortBy || USER_TABLE_DEFAULT_SORT,
                order: order || USER_TABLE_DEFAULT_ORDER,
            });
            const response = (await fetchData({
                url: `${globalSupportAdminsSearchEndpoint}?${params.toString()}`,
                method: FETCH_METHODS.GET,
                skipAuth: false,
                responseHandling: [],
            })) as GlobalSupportAdminSearchResponse;

            return { data: response.items, total: response.total };
        },
        ...(options as object),
        retry: false,
        refetchOnMount: 'always',
        refetchOnWindowFocus: false,
    });
