import { useQuery } from '@tanstack/react-query';
import { getDpaVersions } from '../api/tenant/getDpaVersions';

export const DPA_VERSIONS_KEY = 'dpa-versions';

/** Loads the published DPA versions of a tenant (newest first). */
export const useDpaVersions = (tenantId: number, enabled = true) =>
    useQuery({
        queryKey: [DPA_VERSIONS_KEY, tenantId],
        queryFn: () => getDpaVersions(tenantId),
        enabled: enabled && Number.isFinite(tenantId),
        staleTime: 60_000,
    });
