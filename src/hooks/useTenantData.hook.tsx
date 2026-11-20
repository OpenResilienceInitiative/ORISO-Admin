import { useQuery, useQueryClient } from '@tanstack/react-query';
import getTenantData from '../api/tenant/getTenantData';
import { useAppConfigContext } from '../context/useAppConfig';
import { TenantData } from '../types/tenant';
import { getAccessTokenForRequests } from '../api/auth/auth';
import parseJwt from '../utils/parseJWT';
import { fetchPublicTenantBySlug } from './publicTenantQuery';

export const TENANT_DATA_KEY = 'tenant-data';
export const useTenantData = () => {
    const { settings } = useAppConfigContext();
    const queryClient = useQueryClient();
    const accessToken = getAccessTokenForRequests();
    const parsedToken = accessToken ? parseJwt(accessToken || '') : null;
    let tokenTenantId: number | null = null;
    if (typeof parsedToken?.tenantId === 'number') {
        tokenTenantId = parsedToken.tenantId;
    } else if (typeof parsedToken?.tenantId === 'string' && parsedToken.tenantId.trim() !== '') {
        tokenTenantId = Number(parsedToken.tenantId);
    }

    return useQuery<TenantData>({
        queryKey: [TENANT_DATA_KEY, tokenTenantId ?? 'no-tenant-claim'],
        queryFn: async () => {
            const fallback = { settings: {}, licensing: {} };
            try {
                const tenant = await fetchPublicTenantBySlug(queryClient, settings);
                return tenant ? await getTenantData(tenant, settings.multitenancyWithSingleDomainEnabled) : fallback;
            } catch {
                return fallback;
            }
        },
        staleTime: 60_000,
    });
};
