import { useQuery } from '@tanstack/react-query';
import getPublicTenantData from '../api/tenant/getPublicTenantData';
import { useAppConfigContext } from '../context/useAppConfig';
import { TenantData } from '../types/tenant';
import getLocationVariables from '../utils/getLocationVariables';

export const PUBLIC_TENANT_DATA_KEY = 'public-tenant-data';

export const usePublicTenantData = () => {
    const { settings } = useAppConfigContext();
    const { subdomain } = getLocationVariables();
    const slug = settings.multitenancyWithSingleDomainEnabled
        ? settings.mainTenantSubdomainForSingleDomainMultitenancy
        : subdomain;

    return useQuery<TenantData>({
        queryKey: [PUBLIC_TENANT_DATA_KEY, slug ?? 'no-slug'],
        queryFn: async () => {
            try {
                return await getPublicTenantData(settings);
            } catch {
                return { settings: {}, licensing: {} } as TenantData;
            }
        },
        enabled: !!slug,
        staleTime: 60_000,
    });
};
