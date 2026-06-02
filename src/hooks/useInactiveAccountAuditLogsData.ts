import { QueryOptions, useQuery, UseQueryOptions } from 'react-query';
import { fetchData, FETCH_METHODS } from '../api/fetchData';
import { inactiveAccountAuditLogsEndpoint } from '../appConfig';
import { InactiveAccountAuditLogsResponse } from '../types/inactiveAccountAuditLogs';

interface InactiveAccountAuditLogsDataProps extends UseQueryOptions<InactiveAccountAuditLogsResponse> {
    page: number;
    perPage: number;
    accountRole?: string;
    accountId?: string;
}

export const useInactiveAccountAuditLogsData = ({
    page,
    perPage,
    accountRole,
    accountId,
    ...options
}: InactiveAccountAuditLogsDataProps) => {
    const params = new URLSearchParams({
        page: String(page),
        perPage: String(perPage),
    });

    if (accountRole) {
        params.set('accountRole', accountRole);
    }
    if (accountId?.trim()) {
        params.set('accountId', accountId.trim());
    }

    return useQuery(
        ['INACTIVE_ACCOUNT_AUDIT_LOGS', page, perPage, accountRole ?? '', accountId ?? ''],
        () =>
            fetchData({
                url: `${inactiveAccountAuditLogsEndpoint}?${params.toString()}`,
                method: FETCH_METHODS.GET,
                skipAuth: false,
                responseHandling: [],
            }),
        {
            ...options,
            retry: false,
            refetchOnWindowFocus: false,
        } as QueryOptions<InactiveAccountAuditLogsResponse>,
    );
};
