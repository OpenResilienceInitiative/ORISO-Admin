import { useQuery } from '@tanstack/react-query';
import { getActiveDpaForward } from '../api/tenantOnboarding/dpaForward';

export const DPA_ACTIVE_FORWARD_KEY = 'tenant-dpa-active-forward';

/**
 * Pending forwarded DPA signature of the admin's own tenant (#724). Only
 * consulted while the status is blocked-but-signable: a positive answer
 * softens the hard blocker into the friendly pending dialog. No automatic
 * retries — on error the gate simply stays with the hard blocker
 * (fail-closed), and its explicit retry refetches this too.
 */
export const useDpaActiveForward = (tenantId: number, enabled = true) =>
    useQuery({
        queryKey: [DPA_ACTIVE_FORWARD_KEY, tenantId],
        queryFn: () => getActiveDpaForward(tenantId),
        enabled: enabled && Number.isFinite(tenantId) && tenantId > 0,
        staleTime: 30_000,
        retry: false,
        refetchOnWindowFocus: false,
    });
