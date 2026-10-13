import { useQuery } from '@tanstack/react-query';
import getPublicTenantData, { getPublicTenantDataById } from '../api/tenant/getPublicTenantData';
import { useAppConfigContext } from '../context/useAppConfig';
import { TenantData } from '../types/tenant';
import getLocationVariables from '../utils/getLocationVariables';

export const PUBLIC_TENANT_DATA_KEY = 'public-tenant-data';

export const usePublicTenantData = (tenantId?: string) => {
    const { settings } = useAppConfigContext();
    const { subdomain } = getLocationVariables();
    const slug = settings.multitenancyWithSingleDomainEnabled
        ? settings.mainTenantSubdomainForSingleDomainMultitenancy
        : subdomain;

    return useQuery<TenantData>({
        queryKey:
            tenantId == null ? [PUBLIC_TENANT_DATA_KEY, slug ?? 'no-slug'] : [PUBLIC_TENANT_DATA_KEY, 'id', tenantId],
        queryFn: async () => {
            try {
                return tenantId == null ? await getPublicTenantData(settings) : await getPublicTenantDataById(tenantId);
            } catch {
                return { settings: {}, licensing: {} } as TenantData;
            }
        },
        enabled: tenantId == null ? !!slug : /^\d+$/.test(tenantId) && Number(tenantId) > 0,
        staleTime: 60_000,
    });
};
