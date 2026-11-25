import { useQuery } from '@tanstack/react-query';
import { getPublicTenantDataById } from '../api/tenant/getPublicTenantData';
import { useAppConfigContext } from '../context/useAppConfig';
import type { TenantData } from '../types/tenant';
import { PUBLIC_TENANT_DATA_KEY, publicTenantQueryOptions } from './publicTenantQuery';

export { PUBLIC_TENANT_DATA_KEY } from './publicTenantQuery';

const emptyTenant = { settings: {}, licensing: {} } as TenantData;

export const usePublicTenantData = (tenantId?: string) => {
    const { settings } = useAppConfigContext();

    return useQuery<TenantData | null, Error, TenantData, readonly string[]>(
        tenantId == null
            ? {
                  ...publicTenantQueryOptions(settings),
                  select: (tenant) => tenant ?? emptyTenant,
              }
            : {
                  queryKey: [PUBLIC_TENANT_DATA_KEY, 'id', tenantId],
                  queryFn: () => getPublicTenantDataById(tenantId).catch(() => emptyTenant),
                  enabled: /^\d+$/.test(tenantId) && Number(tenantId) > 0,
                  staleTime: 60_000,
              },
    );
};
