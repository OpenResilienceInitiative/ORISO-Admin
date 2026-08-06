import { useQuery } from '@tanstack/react-query';
import { getDpaVersions } from '../api/tenant/getDpaVersions';

export const DPA_VERSIONS_KEY = 'dpa-versions';

/**
 * Loads the published DPA versions of a tenant (newest first). `silent`
 * suppresses the global toast/redirect error handling (used by the DPA
 * blocker gate, which renders its own inline error state).
 */
export const useDpaVersions = (tenantId: number, enabled = true, options: { silent?: boolean } = {}) =>
    useQuery({
        queryKey: [DPA_VERSIONS_KEY, tenantId],
        queryFn: () => getDpaVersions(tenantId, options),
        enabled: enabled && Number.isFinite(tenantId),
        staleTime: 60_000,
    });
