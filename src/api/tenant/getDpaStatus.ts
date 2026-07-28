import { tenantAdminEndpoint } from '../../appConfig';
import { TenantDpaStatusInfo } from '../../types/dpa';
import { FETCH_ERRORS, FETCH_METHODS, fetchData } from '../fetchData';

/**
 * Authoritative DPA status of a tenant for its authenticated tenant admins
 * (TEN-INV-U9 contract). Silent error handling on purpose: the caller is the
 * global DPA blocker gate, which fails closed and renders its own retry
 * state — no toast, no access-denied redirect.
 */
export const getDpaStatus = (tenantId: number) =>
    fetchData({
        url: `${tenantAdminEndpoint}/${tenantId}/dpa/status`,
        method: FETCH_METHODS.GET,
        skipAuth: false,
        responseHandling: [FETCH_ERRORS.FORBIDDEN_SILENT, FETCH_ERRORS.CATCH_ALL_SILENT],
    }) as Promise<TenantDpaStatusInfo>;
