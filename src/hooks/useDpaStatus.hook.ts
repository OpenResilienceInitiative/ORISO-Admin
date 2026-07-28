import { useQuery } from '@tanstack/react-query';
import { getDpaStatus } from '../api/tenant/getDpaStatus';

export const DPA_STATUS_KEY = 'tenant-dpa-status';

/**
 * Authoritative DPA status of the admin's own tenant (TEN-INV-U9/U10).
 * No automatic retries: the blocker gate fails closed on error and offers an
 * explicit retry, so silent retry loops would only delay the lock screen.
 */
export const useDpaStatus = (tenantId: number, enabled = true) =>
    useQuery({
        queryKey: [DPA_STATUS_KEY, tenantId],
        queryFn: () => getDpaStatus(tenantId),
        enabled: enabled && Number.isFinite(tenantId) && tenantId > 0,
        staleTime: 30_000,
        retry: false,
        refetchOnWindowFocus: false,
    });
