import { addonServiceEndpoint } from '../../appConfig';
import type {
    AddonRegistry,
    AddonSettings,
    AddonSettingsValues,
    AddonStats,
    AddonTenantState,
    AdminAddon,
    AgencyOverride,
} from '../../addons/addonTypes';
import { FETCH_ERRORS, FETCH_METHODS, FETCH_SUCCESS, fetchData } from '../fetchData';

const READ_HANDLING = [FETCH_ERRORS.FORBIDDEN, FETCH_ERRORS.NO_MATCH, FETCH_ERRORS.CATCH_ALL_SILENT];
const WRITE_HANDLING = [FETCH_ERRORS.FORBIDDEN, FETCH_ERRORS.NO_MATCH, FETCH_ERRORS.CATCH_ALL, FETCH_SUCCESS.CONTENT];

const adminAddonsUrl = `${addonServiceEndpoint}/admin/addons`;
const addonUrl = (name: string) => `${adminAddonsUrl}/${encodeURIComponent(name)}`;

export const queryString = (params: Record<string, number | string | null | undefined>) => {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
            search.set(key, String(value));
        }
    });
    const text = search.toString();
    return text ? `?${text}` : '';
};

export class AddonSettingsValidationError extends Error {
    detail?: string;

    constructor(detail?: string) {
        super('ADDON_SETTINGS_INVALID');
        this.detail = detail;
        Object.setPrototypeOf(this, AddonSettingsValidationError.prototype);
    }
}

export const getAdminAddons = (tenantId?: number | null): Promise<AdminAddon[]> =>
    fetchData({
        url: `${adminAddonsUrl}${queryString({ tenantId })}`,
        method: FETCH_METHODS.GET,
        responseHandling: READ_HANDLING,
    }).then((result) => (Array.isArray(result) ? result : []));

/** The Träger of one add-on with their switch and agency overrides; SuperAdmins only. */
export const getAddonTenants = (name: string): Promise<AddonTenantState[]> =>
    fetchData({
        url: `${addonUrl(name)}/tenants`,
        method: FETCH_METHODS.GET,
        responseHandling: READ_HANDLING,
    }).then((result) => (Array.isArray(result) ? result : []));

export const setAddonEnabledForTenant = (name: string, tenantId: number, enabled: boolean): Promise<unknown> =>
    fetchData({
        url: `${addonUrl(name)}/tenants/${tenantId}`,
        method: FETCH_METHODS.PUT,
        bodyData: JSON.stringify({ enabled }),
        responseHandling: WRITE_HANDLING,
    });

export const setAddonEnabledForAgency = (
    name: string,
    tenantId: number,
    agencyId: number,
    enabled: boolean,
): Promise<AgencyOverride> =>
    fetchData({
        url: `${addonUrl(name)}/tenants/${tenantId}/agencies/${agencyId}`,
        method: FETCH_METHODS.PUT,
        bodyData: JSON.stringify({ enabled }),
        responseHandling: WRITE_HANDLING,
    });

export const clearAddonAgencyOverride = (name: string, tenantId: number, agencyId: number): Promise<unknown> =>
    fetchData({
        url: `${addonUrl(name)}/tenants/${tenantId}/agencies/${agencyId}`,
        method: FETCH_METHODS.DELETE,
        responseHandling: [FETCH_ERRORS.FORBIDDEN, FETCH_ERRORS.NO_MATCH, FETCH_ERRORS.CATCH_ALL],
    });

export const getAddonSettings = (name: string, tenantId: number, agencyId?: number | null): Promise<AddonSettings> =>
    fetchData({
        url: `${addonUrl(name)}/settings${queryString({ tenantId, agencyId })}`,
        method: FETCH_METHODS.GET,
        responseHandling: READ_HANDLING,
    }).then((result) => ({ schema: result?.schema ?? null, values: result?.values ?? {} }));

const readMessage = async (response: unknown): Promise<string | undefined> => {
    try {
        const body = await (response as Response).json();
        return typeof body?.message === 'string' ? body.message : undefined;
    } catch {
        return undefined;
    }
};

export const saveAddonSettings = async (
    name: string,
    tenantId: number,
    agencyId: number | null | undefined,
    values: AddonSettingsValues,
): Promise<AddonSettingsValues> => {
    try {
        return await fetchData({
            url: `${addonUrl(name)}/settings${queryString({ tenantId, agencyId })}`,
            method: FETCH_METHODS.PUT,
            bodyData: JSON.stringify(values),
            responseHandling: [FETCH_ERRORS.BAD_REQUEST_WITH_RESPONSE, ...WRITE_HANDLING],
        });
    } catch (error) {
        if (typeof Response !== 'undefined' && error instanceof Response && error.status === 400) {
            throw new AddonSettingsValidationError(await readMessage(error));
        }
        throw error;
    }
};

export const getAddonStats = (name: string, tenantId: number): Promise<AddonStats> =>
    fetchData({
        url: `${addonUrl(name)}/stats${queryString({ tenantId })}`,
        method: FETCH_METHODS.GET,
        responseHandling: READ_HANDLING,
    }).then((result) => ({ stats: Array.isArray(result?.stats) ? result.stats : [] }));

export const getAddonRegistry = (): Promise<AddonRegistry> =>
    fetchData({
        url: `${addonServiceEndpoint}/registry`,
        method: FETCH_METHODS.GET,
        responseHandling: READ_HANDLING,
    }).then((result) => ({
        contract: result?.contract ?? '',
        addons: Array.isArray(result?.addons) ? result.addons : [],
    }));
