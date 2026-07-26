import { useQuery } from '@tanstack/react-query';
import { getDpaGate } from '../api/tenant/getDpaGate';

export const DPA_GATE_KEY = 'dpa-gate';

export const useDpaGate = (tenantId: number, enabled = true) =>
    useQuery({
        queryKey: [DPA_GATE_KEY, tenantId],
        queryFn: () => getDpaGate(tenantId),
        enabled: enabled && Number.isFinite(tenantId) && tenantId > 0,
        staleTime: 30_000,
        retry: false,
    });
