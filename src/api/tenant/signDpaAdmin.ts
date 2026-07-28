import { tenantAdminEndpoint } from '../../appConfig';
import { DpaAdminSignRequest, TenantDpaStatusInfo } from '../../types/dpa';
import { FETCH_ERRORS, FETCH_METHODS, FETCH_SUCCESS, fetchData } from '../fetchData';

/**
 * Signs the currently published DPA version as an authenticated tenant admin
 * (TEN-INV-U9 contract, POST /tenantadmin/{id}/dpa/sign). Returns the
 * resulting authoritative status — VALID on success — which the blocker gate
 * writes back into the status query so the block lifts immediately and
 * permanently. Errors are handled inline by the blocker (no toast/redirect).
 */
export const signDpaAdmin = (tenantId: number, body: DpaAdminSignRequest) =>
    fetchData({
        url: `${tenantAdminEndpoint}/${tenantId}/dpa/sign`,
        method: FETCH_METHODS.POST,
        bodyData: JSON.stringify(body),
        skipAuth: false,
        // CONTENT: the sign endpoint answers with the resulting DpaStatusDTO body.
        responseHandling: [FETCH_SUCCESS.CONTENT, FETCH_ERRORS.FORBIDDEN_SILENT, FETCH_ERRORS.CATCH_ALL_SILENT],
    }) as Promise<TenantDpaStatusInfo>;
