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
export const useTenantAppearanceFormData = (
    tenantId: string,
    { successMessageKey, ownOverrides = false }: { successMessageKey?: string | null; ownOverrides?: boolean } = {},
) => {
    const { data: tenantData, isLoading: isTenantLoading } = useTenantData();
    const seedTenantAdminData = useMemo(() => {
        if (ownOverrides || tenantData?.id == null || tenantId === '' || tenantId === 'add') {
            return undefined;
        }

        if (String(tenantData.id) !== String(tenantId)) {
            return undefined;
        }

        return mapTenantDataToTenantAdminData(tenantData);
    }, [tenantData, tenantId, ownOverrides]);

    const shouldFetchTenantAdmin = !!tenantId && tenantId !== 'add' && !seedTenantAdminData;
    const {
        data: tenantAdminData,
        isLoading: isAdminLoading,
        isError,
    } = useSingleTenantData({
        id: tenantId,
        enabled: shouldFetchTenantAdmin,
    });

    const { mutate, mutateAsync, isPending } = useTenantAdminDataMutation({
        id: tenantId,
        seedTenantAdminData,
        prefetchTenantAdminData: !seedTenantAdminData,
        ...(successMessageKey === undefined ? {} : { successMessageKey }),
    });

    // The API adapter may turn a caught read failure into { name: '' }.
    // Never treat that response, or a different tenant, as verified own overrides.
    const invalidOwnData =
        ownOverrides &&
        !isAdminLoading &&
        (tenantAdminData?.id == null || String(tenantAdminData.id) !== String(tenantId));
    return {
        data: (invalidOwnData ? undefined : tenantAdminData ?? seedTenantAdminData) as TenantAdminData | undefined,
        isLoading: seedTenantAdminData ? isTenantLoading : isAdminLoading,
        isError: isError || invalidOwnData,
        mutate,
        mutateAsync,
        isPending,
    };
};
