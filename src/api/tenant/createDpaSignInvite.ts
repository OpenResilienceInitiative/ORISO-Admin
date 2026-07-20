import { appURL, tenantAdminEndpoint } from '../../appConfig';
import { DpaSignInvite } from '../../types/dpa';
import { FETCH_ERRORS, FETCH_METHODS, FETCH_SUCCESS, fetchData } from '../fetchData';

/** Creates a single-use public signing link without exposing the raw token to app state. */
export const createDpaSignInvite = (tenantId: number) =>
    fetchData({
        url: `${tenantAdminEndpoint}/${tenantId}/dpa/invite`,
        method: FETCH_METHODS.POST,
        skipAuth: false,
        responseHandling: [FETCH_SUCCESS.CONTENT, FETCH_ERRORS.CONFLICT, FETCH_ERRORS.CATCH_ALL_SILENT],
    }) as Promise<DpaSignInvite>;

/** TenantService may return a relative path; public signing always belongs to the App origin. */
export const resolveDpaSignLink = (signLink: string, configuredAppUrl = appURL) =>
    new URL(signLink, `${configuredAppUrl.replace(/\/$/, '')}/`).toString();
