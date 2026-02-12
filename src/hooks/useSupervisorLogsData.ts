import { QueryOptions, useQuery, UseQueryOptions } from 'react-query';
import { fetchData, FETCH_METHODS } from '../api/fetchData';
import { supervisorLogsEndpoint } from '../appConfig';
import { SupervisorLogsResponse } from '../types/supervisorLogs';

interface SupervisorLogsDataProps extends UseQueryOptions<SupervisorLogsResponse> {
    page: number;
    perPage: number;
}

export const useSupervisorLogsData = ({ page, perPage, ...options }: SupervisorLogsDataProps) => {
    return useQuery(
        ['SUPERVISOR_LOGS', page, perPage],
        () =>
            fetchData({
                url: `${supervisorLogsEndpoint}?page=${page}&perPage=${perPage}`,
                method: FETCH_METHODS.GET,
                skipAuth: false,
                responseHandling: [],
            }),
        {
            ...options,
            retry: false,
            refetchOnWindowFocus: false,
        } as QueryOptions<SupervisorLogsResponse>,
    );
};
