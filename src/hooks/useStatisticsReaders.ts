import { useMutation, UseMutationOptions, useQuery, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { fetchData, FETCH_ERRORS, FETCH_METHODS, FETCH_SUCCESS } from '../api/fetchData';
import { statisticsReadersEndpoint, statisticsReadersSearchEndpoint } from '../appConfig';
import {
    normalizeTenantAdminSortField,
    USER_TABLE_DEFAULT_ORDER,
    USER_TABLE_DEFAULT_SORT,
} from '../constants/userTableSort';
import { CounselorData } from '../types/counselor';
import { HalResponse, ResponseList } from '../types/ResponseList';
import { fetchUserSearchWithSortFallback } from '../utils/fetchUserSearchWithSortFallback';
import { parseHalResponse } from '../utils/parseHalResponse';

/**
 * Statistik-Leser·innen (ORISO-UserService#1666): read-only platform statistics accounts. Only a
 * platform admin manages them; the endpoints answer 403 to everyone else. Request and response
 * shapes are the tenant-admin ones (CreateAdminDTO / UpdateAdminDTO, AdminResponseDTO,
 * AdminSearchResultDTO), so the generic user table renders the rows unchanged.
 */
export const STATISTICS_READERS_QUERY_KEY = 'STATISTICS_READERS';
export const STATISTICS_READER_QUERY_KEY = 'STATISTICS_READER';

export interface StatisticsReaderFormValues {
    firstname?: string;
    lastname?: string;
    username?: string;
    email?: string;
}

interface StatisticsReadersDataProps
    extends Omit<UseQueryOptions<ResponseList<CounselorData>>, 'queryKey' | 'queryFn'> {
    search?: string;
    current?: number;
    sortBy?: string;
    order?: string;
    pageSize?: number;
}

/** One page of readers. Unlike the tenant-admin list, the server pages: readers have their own endpoint. */
export const useStatisticsReadersData = ({
    search,
    current,
    sortBy,
    order,
    pageSize,
    ...options
}: StatisticsReadersDataProps = {}) =>
    useQuery({
        queryKey: [STATISTICS_READERS_QUERY_KEY, search, current, sortBy, order, pageSize],
        queryFn: () =>
            fetchUserSearchWithSortFallback({
                url: `${statisticsReadersSearchEndpoint}?query=${encodeURIComponent(search || '*')}&page=${
                    current || 1
                }&perPage=${pageSize || 10}`,
                sortBy: sortBy || USER_TABLE_DEFAULT_SORT,
                order: order || USER_TABLE_DEFAULT_ORDER,
                normalizeSortField: normalizeTenantAdminSortField,
                rethrowOnFailure: true,
            }),
        ...(options as object),
        retry: false,
        refetchOnMount: 'always',
        refetchOnWindowFocus: false,
    });

interface StatisticsReaderDataProps extends Omit<UseQueryOptions<CounselorData>, 'queryKey' | 'queryFn'> {
    id: string;
}

export const useStatisticsReaderData = ({ id, ...options }: StatisticsReaderDataProps) =>
    useQuery({
        queryKey: [STATISTICS_READER_QUERY_KEY, id],
        queryFn: () =>
            fetchData({
                url: `${statisticsReadersEndpoint}/${id}`,
                method: FETCH_METHODS.GET,
                skipAuth: false,
                responseHandling: [],
                // eslint-disable-next-line no-underscore-dangle
            }).then((result: HalResponse<CounselorData>) => result?._embedded as CounselorData),
        ...(options as object),
    });

interface AddOrUpdateStatisticsReaderOptions
    extends UseMutationOptions<CounselorData, Error, StatisticsReaderFormValues, Error | Response> {
    id?: string;
}

/**
 * Creates (POST) or updates (PUT) a reader. Only the fields the backend accepts are sent: no
 * password (the person sets one from the e-mail), no tenant (the server pins the platform), and
 * no username on update (it is fixed once created).
 */
export const useAddOrUpdateStatisticsReader = ({ id, ...options }: AddOrUpdateStatisticsReaderOptions) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (formValues) => {
            const trimmed = (value?: string) => value?.trim() ?? '';
            const body: StatisticsReaderFormValues = {
                firstname: trimmed(formValues.firstname),
                lastname: trimmed(formValues.lastname),
                ...(id ? {} : { username: trimmed(formValues.username) || trimmed(formValues.email) }),
                email: trimmed(formValues.email),
            };

            const response = await fetchData({
                url: id ? `${statisticsReadersEndpoint}/${id}` : statisticsReadersEndpoint,
                method: id ? FETCH_METHODS.PUT : FETCH_METHODS.POST,
                responseHandling: [
                    FETCH_SUCCESS.CONTENT,
                    FETCH_ERRORS.BAD_REQUEST_WITH_RESPONSE,
                    FETCH_ERRORS.CONFLICT_WITH_RESPONSE,
                    FETCH_ERRORS.CATCH_ALL,
                ],
                bodyData: JSON.stringify(body),
            });

            const parsed = await parseHalResponse(response);
            if (parsed && typeof parsed === 'object' && '_embedded' in parsed) {
                // eslint-disable-next-line no-underscore-dangle
                return (parsed as { _embedded: CounselorData })._embedded;
            }
            return { ...body, id } as unknown as CounselorData;
        },
        ...options,
        onSuccess: (responseData, variables, onMutateResult, context) => {
            if (responseData?.id) {
                queryClient.setQueryData([STATISTICS_READER_QUERY_KEY, responseData.id], responseData);
            }
            queryClient.invalidateQueries({ queryKey: [STATISTICS_READERS_QUERY_KEY] });
            options?.onSuccess?.(responseData, variables, onMutateResult, context);
        },
    });
};

export const useDeleteStatisticsReader = (options: UseMutationOptions<void, Error, string>) => {
    const queryClient = useQueryClient();

    return useMutation<void, Error, string>({
        mutationFn: (id) =>
            fetchData({
                url: `${statisticsReadersEndpoint}/${id}`,
                method: FETCH_METHODS.DELETE,
                skipAuth: false,
                responseHandling: [FETCH_ERRORS.CATCH_ALL],
            }),
        ...options,
        onSuccess: (responseData, variables, onMutateResult, context) => {
            queryClient.invalidateQueries({ queryKey: [STATISTICS_READERS_QUERY_KEY] });
            queryClient.removeQueries({ queryKey: [STATISTICS_READER_QUERY_KEY, variables] });
            options?.onSuccess?.(responseData, variables, onMutateResult, context);
        },
    });
};
