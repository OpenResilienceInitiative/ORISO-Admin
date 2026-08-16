import { tenantAdminEndpoint } from '../../appConfig';
import type { TenantPermissionPolicies } from '../../types/permissionPolicy';
import { FETCH_ERRORS, FETCH_METHODS, fetchData } from '../fetchData';

export const getTenantPermissionPolicies = (tenantId: string) =>
    fetchData({
        url: `${tenantAdminEndpoint}/${tenantId}/permission-policies`,
        method: FETCH_METHODS.GET,
        skipAuth: false,
        responseHandling: [FETCH_ERRORS.CATCH_ALL],
    }) as Promise<TenantPermissionPolicies>;

export const updateTenantPermissionPolicies = (policies: TenantPermissionPolicies) =>
    fetchData({
        url: `${tenantAdminEndpoint}/${policies.tenantId}/permission-policies`,
        method: FETCH_METHODS.PUT,
        skipAuth: false,
        bodyData: JSON.stringify(policies),
        responseHandling: [FETCH_ERRORS.CATCH_ALL],
    }) as Promise<TenantPermissionPolicies>;
