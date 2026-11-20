import { fetchData, FETCH_METHODS } from '../fetchData';
import { baseTenantPublicEndpoint } from '../../appConfig';
import { TenantDataProtectionOfficer } from '../../types/tenant';

/**
 * The Träger's DPO from the public tenant read — the same source AgencyService inherits it from,
 * and readable by an agency admin who may not open /tenantadmin (ORISO-Admin#1067).
 */
export const getTraegerDataProtectionOfficer = (tenantId: number | string) =>
    fetchData({
        url: `${baseTenantPublicEndpoint}/id/${tenantId}`,
        method: FETCH_METHODS.GET,
        skipAuth: true,
        responseHandling: [],
    }).then(
        (tenant: { dataProtectionOfficer?: TenantDataProtectionOfficer | null } | null) =>
            tenant?.dataProtectionOfficer ?? null,
    );
