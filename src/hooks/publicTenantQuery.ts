import { queryOptions, type QueryClient } from '@tanstack/react-query';
import getPublicTenantData from '../api/tenant/getPublicTenantData';
import type { AppConfigInterface } from '../types/AppConfigInterface';
import type { TenantData } from '../types/tenant';
import getLocationVariables from '../utils/getLocationVariables';

export const PUBLIC_TENANT_DATA_KEY = 'public-tenant-data';

export const publicTenantQueryOptions = (settings: AppConfigInterface) => {
    const { subdomain } = getLocationVariables();
    const slug = settings.multitenancyWithSingleDomainEnabled
        ? settings.mainTenantSubdomainForSingleDomainMultitenancy
        : subdomain;

    const queryKey: readonly string[] = [PUBLIC_TENANT_DATA_KEY, slug ?? 'no-slug'];

    return queryOptions({
        queryKey,
        queryFn: async (): Promise<TenantData | null> => {
            try {
                return (await getPublicTenantData(settings)) ?? null;
            } catch {
                // An empty branding result must not become a tenant for an authenticated read.
                return null;
            }
        },
        enabled: !!slug,
        staleTime: 60_000,
    });
};

export const fetchPublicTenantBySlug = (queryClient: QueryClient, settings: AppConfigInterface) => {
    const options = publicTenantQueryOptions(settings);
    // fetchQuery does not honor the observer's enabled option.
    return options.enabled ? queryClient.fetchQuery(options) : Promise.resolve(null);
};
