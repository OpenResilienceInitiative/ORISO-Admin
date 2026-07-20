import { useQuery } from '@tanstack/react-query';
import { getDpaSignatures } from '../api/tenant/getDpaSignatures';

export const DPA_SIGNATURES_KEY = 'dpa-signatures';

export const useDpaSignatures = (tenantId: number, enabled = true) =>
    useQuery({
        queryKey: [DPA_SIGNATURES_KEY, tenantId],
        queryFn: () => getDpaSignatures(tenantId),
        enabled: enabled && Number.isFinite(tenantId) && tenantId > 0,
        staleTime: 30_000,
        retry: false,
    });
