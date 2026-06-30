import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { fetchData, FETCH_METHODS } from '../api/fetchData';
import { supervisorLogsEndpoint } from '../appConfig';
import { SupervisorLogsResponse } from '../types/supervisorLogs';

interface SupervisorLogsDataProps extends Omit<UseQueryOptions<SupervisorLogsResponse>, 'queryKey' | 'queryFn'> {
    page: number;
    perPage: number;
}

export const useSupervisorLogsData = ({ page, perPage, ...options }: SupervisorLogsDataProps) => {
    return useQuery({
        queryKey: ['SUPERVISOR_LOGS', page, perPage],
        queryFn: () =>
            fetchData({
                url: `${supervisorLogsEndpoint}?page=${page}&perPage=${perPage}`,
                method: FETCH_METHODS.GET,
                skipAuth: false,
                responseHandling: [],
            }),
        ...(options as object),
        retry: false,
        refetchOnWindowFocus: false,
    });
};
