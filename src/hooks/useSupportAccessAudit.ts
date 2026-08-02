import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { fetchData, FETCH_METHODS } from '../api/fetchData';
import { supportAccessAuditEndpoint } from '../appConfig';

export const SUPPORT_ACCESS_AUDIT_QUERY_KEY = 'SUPPORT_ACCESS_AUDIT';

export interface SupportAccessAuditEntry {
    id: number;
    handshakeId: string;
    purpose: string;
    event: string;
    actorId?: string;
    counterpartId?: string;
    tenantId?: number;
    agencyId?: number;
    createDate: string;
}

interface SupportAccessAuditResponse {
    content: SupportAccessAuditEntry[];
    totalElements: number;
}

interface SupportAccessAuditProps
    extends Omit<UseQueryOptions<{ data: SupportAccessAuditEntry[]; total: number }>, 'queryKey' | 'queryFn'> {
    current?: number;
    pageSize?: number;
}

/**
 * Role-scoped audit read (ADR-018 §6). Deliberately sends no scope: the backend narrows the result
 * to the caller's own tenant or agencies, so there is nothing here a client could widen.
 */
export const useSupportAccessAudit = ({ current, pageSize, ...options }: SupportAccessAuditProps = {}) =>
    useQuery({
        queryKey: [SUPPORT_ACCESS_AUDIT_QUERY_KEY, current, pageSize],
        queryFn: async () => {
            const params = new URLSearchParams({
                page: String(current || 1),
                perPage: String(pageSize || 20),
            });
            const response = (await fetchData({
                url: `${supportAccessAuditEndpoint}?${params.toString()}`,
                method: FETCH_METHODS.GET,
                skipAuth: false,
                responseHandling: [],
            })) as SupportAccessAuditResponse;

            return { data: response.content ?? [], total: response.totalElements ?? 0 };
        },
        ...(options as object),
        retry: false,
        refetchOnWindowFocus: false,
    });
