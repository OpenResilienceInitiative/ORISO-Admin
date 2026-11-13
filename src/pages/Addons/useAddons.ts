import { keepPreviousData, useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    clearAddonAgencyOverride,
    getAddonRegistry,
    getAddonSettings,
    getAddonStats,
    getAddonTenants,
    getAdminAddons,
    saveAddonSettings,
    setAddonEnabledForAgency,
    setAddonEnabledGlobally,
    setAddonEnabledForTenant,
} from '../../api/addons/addonsApi';
import { getAddonAuditEntries } from '../../api/addons/addonAuditApi';
import getAgencyDataById from '../../api/agency/getAgencyById';
import { searchTenantData } from '../../api/tenant/searchTenantData';
import type { AddonAuditQuery, AddonSettingsValues } from '../../addons/addonTypes';
import decodeHTML from '../../utils/decodeHTML';

export const ADMIN_ADDONS_KEY = 'admin-addons';
export const ADDON_REGISTRY_KEY = 'addon-registry';
const ADDON_SETTINGS_KEY = 'addon-settings';
const ADDON_STATS_KEY = 'addon-stats';
const ADDON_AUDIT_KEY = 'addon-audit';
export const ADDON_TENANTS_KEY = 'addon-tenants';
const ALL_TENANTS_KEY = 'addon-all-tenants';

/** Upper bound for the Träger list of the add-on view; a platform has far fewer Träger. */
const TENANT_PAGE_SIZE = 100;
const TENANT_PAGE_LIMIT = 20;

export interface TenantName {
    id: number;
    name: string;
}

/** Every Träger except the platform (id 0), for the SuperAdmin's add-on view. */
const toTenantNames = (rows: { id?: number | string | null; name?: string | null }[]): TenantName[] =>
    rows
        .filter((tenant) => tenant.id != null && Number(tenant.id) > 0)
        .map((tenant) => ({ id: Number(tenant.id), name: decodeHTML(tenant.name || '') || `#${tenant.id}` }));

/** Every Träger except the platform (id 0), for the SuperAdmin's add-on view. */
export const fetchAllTenants = async (): Promise<TenantName[]> => {
    const first = await searchTenantData({ page: 1, perPage: TENANT_PAGE_SIZE });
    const pages = Math.min(Math.ceil((first.total ?? 0) / TENANT_PAGE_SIZE), TENANT_PAGE_LIMIT);
    const rest = await Promise.all(
        Array.from({ length: Math.max(pages - 1, 0) }, (_, index) =>
            searchTenantData({ page: index + 2, perPage: TENANT_PAGE_SIZE }),
        ),
    );
    return [first, ...rest].flatMap((response) => toTenantNames(response.data ?? []));
};

export const useAllTenants = (enabled: boolean) =>
    useQuery({
        queryKey: [ALL_TENANTS_KEY],
        queryFn: fetchAllTenants,
        enabled,
        retry: false,
        staleTime: 5 * 60_000,
    });

export const useAddonTenants = (name: string | null, enabled: boolean) =>
    useQuery({
        queryKey: [ADDON_TENANTS_KEY, name],
        queryFn: () => getAddonTenants(name as string),
        enabled: enabled && !!name,
        retry: false,
    });

export const useAdminAddons = (tenantId: number | null, enabled = true) =>
    useQuery({
        queryKey: [ADMIN_ADDONS_KEY, tenantId],
        queryFn: () => getAdminAddons(tenantId),
        enabled,
        retry: false,
    });

export const useAddonRegistry = (enabled = true) =>
    useQuery({
        queryKey: [ADDON_REGISTRY_KEY],
        queryFn: getAddonRegistry,
        enabled,
        retry: false,
        staleTime: 60_000,
    });

export const useAddonSettings = (name: string, tenantId: number, agencyId: number | null) =>
    useQuery({
        queryKey: [ADDON_SETTINGS_KEY, name, tenantId, agencyId],
        queryFn: () => getAddonSettings(name, tenantId, agencyId),
        retry: false,
    });

export const useAddonStats = (name: string, tenantId: number, enabled: boolean) =>
    useQuery({
        queryKey: [ADDON_STATS_KEY, name, tenantId],
        queryFn: () => getAddonStats(name, tenantId),
        enabled,
        retry: false,
    });

export const useAddonAuditEntries = (params: AddonAuditQuery) =>
    useQuery({
        queryKey: [ADDON_AUDIT_KEY, params],
        queryFn: () => getAddonAuditEntries(params),
        placeholderData: keepPreviousData,
        retry: false,
        refetchOnWindowFocus: false,
    });

export const useAgencyNames = (agencyIds: number[]) =>
    useQueries({
        queries: agencyIds.map((agencyId) => ({
            queryKey: ['addon-agency-name', agencyId],
            queryFn: () =>
                getAgencyDataById(String(agencyId))
                    .then((agency: { name?: string }) => (agency?.name ? decodeHTML(agency.name) : null))
                    .catch(() => null),
            staleTime: 5 * 60_000,
        })),
        combine: (results) =>
            Object.fromEntries(agencyIds.map((agencyId, index) => [agencyId, results[index]?.data ?? null])) as Record<
                number,
                string | null
            >,
    });

const useInvalidateAddons = (tenantId: number) => {
    const queryClient = useQueryClient();
    return () =>
        Promise.all([
            queryClient.invalidateQueries({ queryKey: [ADMIN_ADDONS_KEY, tenantId] }),
            queryClient.invalidateQueries({ queryKey: [ADDON_REGISTRY_KEY] }),
            queryClient.invalidateQueries({ queryKey: [ADDON_TENANTS_KEY] }),
        ]);
};

/** The global switch changes what every Träger sees, so every add-on query is refetched. */
export const useSetGlobalEnabled = (name: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (enabled: boolean) => setAddonEnabledGlobally(name, enabled),
        onSettled: () =>
            Promise.all([
                queryClient.invalidateQueries({ queryKey: [ADMIN_ADDONS_KEY] }),
                queryClient.invalidateQueries({ queryKey: [ADDON_REGISTRY_KEY] }),
                queryClient.invalidateQueries({ queryKey: [ADDON_TENANTS_KEY] }),
            ]),
    });
};

export const useSetTenantEnabled = (name: string, tenantId: number) => {
    const invalidate = useInvalidateAddons(tenantId);
    return useMutation({
        mutationFn: (enabled: boolean) => setAddonEnabledForTenant(name, tenantId, enabled),
        onSettled: invalidate,
    });
};

export const useSetAgencyOverride = (name: string, tenantId: number) => {
    const invalidate = useInvalidateAddons(tenantId);
    return useMutation({
        mutationFn: ({ agencyId, enabled }: { agencyId: number; enabled: boolean }) =>
            setAddonEnabledForAgency(name, tenantId, agencyId, enabled),
        onSettled: invalidate,
    });
};

export const useClearAgencyOverride = (name: string, tenantId: number) => {
    const invalidate = useInvalidateAddons(tenantId);
    return useMutation({
        mutationFn: (agencyId: number) => clearAddonAgencyOverride(name, tenantId, agencyId),
        onSettled: invalidate,
    });
};

export const useSaveAddonSettings = (name: string, tenantId: number, agencyId: number | null) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (values: AddonSettingsValues) => saveAddonSettings(name, tenantId, agencyId, values),
        onSuccess: (saved) => {
            queryClient.setQueryData([ADDON_SETTINGS_KEY, name, tenantId, agencyId], (current: unknown) => ({
                ...(current as object),
                values: saved ?? {},
            }));
        },
    });
};
