import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchData, FETCH_METHODS } from '../api/fetchData';
import { tenantAdminEndpoint } from '../appConfig';
import { TenantAdminData } from '../types/TenantAdminData';
import { mapTenantDataToTenantAdminData } from '../utils/mapTenantDataToTenantAdminData';
import { useTenantData } from './useTenantData.hook';

export const TENANT_ADMIN_DATA_KEY = 'tenant-admin-data';

/**
 * Prefer healthy GET /service/tenant for the signed-in tenant.
 * GET /service/tenantadmin/{id} still 500s for some tenants on pre-dev; Legal and
 * other settings surfaces only need tenant-scoped fields already available on /tenant.
 */
export const useTenantAdminData = () => {
    const { data: tenantData, isLoading: isTenantLoading } = useTenantData();
    const tenantId = tenantData?.id;
    const seedTenantAdminData = useMemo(
        () => (tenantData?.id != null ? mapTenantDataToTenantAdminData(tenantData) : undefined),
        [tenantData],
    );

    const query = useQuery<TenantAdminData>({
        queryKey: [TENANT_ADMIN_DATA_KEY, tenantId],
        queryFn: async () =>
            fetchData({
                url: `${tenantAdminEndpoint}/${tenantId}`,
                method: FETCH_METHODS.GET,
                skipAuth: false,
                responseHandling: [],
            }),
        // Skip the broken tenantadmin GET whenever /service/tenant already seeded the payload.
        enabled: tenantId != null && !seedTenantAdminData,
        staleTime: 60 * 1000,
    });

    return {
        ...query,
        data: seedTenantAdminData ?? query.data,
        isLoading: seedTenantAdminData ? isTenantLoading : query.isLoading,
    };
};
