import { useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getDpaStatus } from '../api/tenant/getDpaStatus';

export const DPA_STATUS_KEY = 'tenant-dpa-status';

/**
 * How often the gate re-asks while the tenant is still locked out. Deliberately
 * gentle: the only reason to poll at all is that the signature is performed by
 * a DIFFERENT person on a DIFFERENT device (the forwarded signatory), so
 * refetch-on-focus can never observe that transition — the waiting admin never
 * leaves the tab. Polling stops the moment the answer is VALID and pauses while
 * the tab is in the background.
 */
export const DPA_STATUS_POLL_MS = 30_000;

/**
 * Authoritative DPA status of the admin's own tenant (TEN-INV-U9/U10).
 *
 * Cache policy is a security decision, not a performance one (JOB7.3): this
 * answer decides whether a tenant may use the platform at all, so it is NEVER
 * served from cache.
 *
 * - `staleTime: 0` + `refetchOnMount: 'always'` — a remounted gate re-asks
 *   instead of trusting a value that may be minutes old.
 * - `gcTime: 0` plus an explicit drop of the cached entry on the FIRST render
 *   of a gate — `refetchOnMount` alone would still hand render #1 the old
 *   value (the refetch only starts in an effect), which is exactly long enough
 *   to flash the admin area at a tenant who is now blocked. Starting without
 *   data means the gate shows its initialization screen while it asks.
 * - `refetchOnWindowFocus` / `refetchOnReconnect: 'always'` — coming back to
 *   the tab re-verifies.
 * - `refetchInterval` — see {@link DPA_STATUS_POLL_MS}.
 *
 * No automatic retries: the gate fails closed on error and offers an explicit
 * retry, so silent retry loops would only delay the lock screen.
 */
export const useDpaStatus = (tenantId: number, enabled = true) => {
    const queryClient = useQueryClient();
    // Once per mounted gate, during its first render — before `useQuery` can
    // read the cache. Idempotent, so a discarded/replayed render is harmless.
    const cacheDropped = useRef(false);
    if (!cacheDropped.current) {
        cacheDropped.current = true;
        queryClient.removeQueries({ queryKey: [DPA_STATUS_KEY, tenantId], exact: true });
    }

    return useQuery({
        queryKey: [DPA_STATUS_KEY, tenantId],
        queryFn: () => getDpaStatus(tenantId),
        enabled: enabled && Number.isFinite(tenantId) && tenantId > 0,
        staleTime: 0,
        gcTime: 0,
        retry: false,
        refetchOnMount: 'always',
        refetchOnReconnect: 'always',
        refetchOnWindowFocus: 'always',
        refetchInterval: (query) => (query.state.data?.status === 'VALID' ? false : DPA_STATUS_POLL_MS),
        refetchIntervalInBackground: false,
    });
};
