import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { fetchData, FETCH_METHODS } from '../api/fetchData';
import { withUtcInstants } from '../utils/backendInstant';
import { deletionAuditLogsEndpoint } from '../appConfig';
import { DeletionAuditLogsResponse } from '../types/deletionAuditLogs';

interface DeletionAuditLogsDataProps extends Omit<UseQueryOptions<DeletionAuditLogsResponse>, 'queryKey' | 'queryFn'> {
    page: number;
    perPage: number;
    targetType?: string;
    outcome?: string;
    targetId?: string;
}

export const useDeletionAuditLogsData = ({
    page,
    perPage,
    targetType,
    outcome,
    targetId,
    ...options
}: DeletionAuditLogsDataProps) => {
    const params = new URLSearchParams({
        page: String(page),
        perPage: String(perPage),
    });

    if (targetType) {
        params.set('targetType', targetType);
    }
    if (outcome) {
        params.set('outcome', outcome);
    }
    if (targetId?.trim()) {
        params.set('targetId', targetId.trim());
    }

    return useQuery({
        queryKey: ['DELETION_AUDIT_LOGS', page, perPage, targetType ?? '', outcome ?? '', targetId ?? ''],
        queryFn: () =>
            fetchData({
                url: `${deletionAuditLogsEndpoint}?${params.toString()}`,
                method: FETCH_METHODS.GET,
                skipAuth: false,
                responseHandling: [],
            }).then(withUtcInstants),
        ...(options as object),
        retry: false,
        refetchOnWindowFocus: false,
    });
};
