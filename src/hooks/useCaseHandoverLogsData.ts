import { QueryOptions, useQuery, UseQueryOptions } from 'react-query';
import { fetchData, FETCH_METHODS } from '../api/fetchData';
import { caseHandoverLogsEndpoint } from '../appConfig';
import { CaseHandoverLogsResponse } from '../types/caseHandoverLogs';

interface CaseHandoverLogsDataProps extends UseQueryOptions<CaseHandoverLogsResponse> {
    page: number;
    perPage: number;
}

export const useCaseHandoverLogsData = ({ page, perPage, ...options }: CaseHandoverLogsDataProps) => {
    return useQuery(
        ['CASE_HANDOVER_LOGS', page, perPage],
        () =>
            fetchData({
                url: `${caseHandoverLogsEndpoint}?page=${page || 1}&perPage=${perPage}`,
                method: FETCH_METHODS.GET,
                skipAuth: false,
                responseHandling: [],
            }),
        {
            ...options,
            retry: false,
            refetchOnWindowFocus: false,
        } as QueryOptions<CaseHandoverLogsResponse>,
    );
};
