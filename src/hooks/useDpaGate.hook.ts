import { useQuery } from '@tanstack/react-query';
import { getDpaGate } from '../api/tenant/getDpaGate';

export const DPA_GATE_KEY = 'dpa-gate';

export const useDpaGate = (tenantId: number, enabled = true) =>
    useQuery({
        queryKey: [DPA_GATE_KEY, tenantId],
        queryFn: () => getDpaGate(tenantId),
        enabled: enabled && Number.isFinite(tenantId) && tenantId > 0,
        staleTime: 30_000,
        // Re-ask the server during renewal grace so expiry changes creation controls.
        refetchInterval: (query) => (query.state.data?.renewalGraceActive ? 30_000 : false),
        retry: false,
    });
