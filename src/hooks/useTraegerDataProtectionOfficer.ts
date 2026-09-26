import { useQuery } from '@tanstack/react-query';
import { getTraegerDataProtectionOfficer } from '../api/tenant/getTraegerDataProtectionOfficer';

export const useTraegerDataProtectionOfficer = (tenantId?: number | string | null) =>
    useQuery({
        queryKey: ['TRAEGER_DPO', tenantId == null ? null : Number(tenantId)],
        queryFn: () => getTraegerDataProtectionOfficer(tenantId as number | string),
        enabled: tenantId != null && tenantId !== '' && Number(tenantId) > 0,
        staleTime: 60_000,
    });
