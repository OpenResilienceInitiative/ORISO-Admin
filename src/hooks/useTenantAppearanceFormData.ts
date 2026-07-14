import { useMemo } from 'react';
import { TenantAdminData } from '../types/TenantAdminData';
import { mapTenantDataToTenantAdminData } from '../utils/mapTenantDataToTenantAdminData';
import { useSingleTenantData } from './useSingleTenantData';
import { useTenantAdminDataMutation } from './useTenantAdminDataMutation.hook';
import { useTenantData } from './useTenantData.hook';

/**
 * Appearance / general theme-settings cards need tenantadmin-shaped data, but
 * GET /service/tenantadmin/{id} currently 500s for some tenants on pre-dev.
 * When the form targets the signed-in tenant, seed from the healthy
 * GET /service/tenant path and skip the broken tenantadmin prefetch (same
 * pattern as GlobalLoginSettingsPage / PR #299).
 */
export const useTenantAppearanceFormData = (tenantId: string) => {
    const { data: tenantData, isLoading: isTenantLoading } = useTenantData();
    const seedTenantAdminData = useMemo(() => {
        if (tenantData?.id == null || tenantId === '' || tenantId === 'add') {
            return undefined;
        }

        if (String(tenantData.id) !== String(tenantId)) {
            return undefined;
        }

        return mapTenantDataToTenantAdminData(tenantData);
    }, [tenantData, tenantId]);

    const shouldFetchTenantAdmin = !!tenantId && tenantId !== 'add' && !seedTenantAdminData;
    const { data: tenantAdminData, isLoading: isAdminLoading } = useSingleTenantData({
        id: tenantId,
        enabled: shouldFetchTenantAdmin,
    });

    const { mutate, isPending } = useTenantAdminDataMutation({
        id: tenantId,
        seedTenantAdminData,
        prefetchTenantAdminData: !seedTenantAdminData,
    });

    return {
        data: (tenantAdminData ?? seedTenantAdminData) as TenantAdminData | undefined,
        isLoading: seedTenantAdminData ? isTenantLoading : isAdminLoading,
        mutate,
        isPending,
    };
};
