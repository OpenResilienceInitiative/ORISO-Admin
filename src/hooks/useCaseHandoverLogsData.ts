import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { fetchData, FETCH_METHODS } from '../api/fetchData';
import { caseHandoverLogsEndpoint } from '../appConfig';
import { CaseHandoverLogsResponse } from '../types/caseHandoverLogs';

interface CaseHandoverLogsDataProps extends Omit<UseQueryOptions<CaseHandoverLogsResponse>, 'queryKey' | 'queryFn'> {
    page: number;
    perPage: number;
}

export const useCaseHandoverLogsData = ({ page, perPage, ...options }: CaseHandoverLogsDataProps) => {
    return useQuery({
        queryKey: ['CASE_HANDOVER_LOGS', page, perPage],
        queryFn: () =>
            fetchData({
                url: `${caseHandoverLogsEndpoint}?page=${page || 1}&perPage=${perPage}`,
                method: FETCH_METHODS.GET,
                skipAuth: false,
                responseHandling: [],
            }),
        ...(options as object),
        retry: false,
        refetchOnWindowFocus: false,
    });
};
