import { tenantAdminEndpoint } from '../../appConfig';
import { DpaVersion } from '../../types/dpa';
import { FETCH_ERRORS, FETCH_METHODS, fetchData } from '../fetchData';

/**
 * Published DPA versions for a tenant, newest first.
 *
 * `silent` (#569 hardening) is used by the global DPA blocker gate: a failure
 * must reject quietly (inline "content unavailable" state) instead of raising
 * the global toast or bouncing the blocked admin to /admin/access-denied.
 */
export const getDpaVersions = (tenantId: number, options: { silent?: boolean } = {}) =>
    fetchData({
        url: `${tenantAdminEndpoint}/${tenantId}/dpa/versions`,
        method: FETCH_METHODS.GET,
        skipAuth: false,
        responseHandling: options.silent
            ? [FETCH_ERRORS.CATCH_ALL_SILENT, FETCH_ERRORS.FORBIDDEN_SILENT]
            : [FETCH_ERRORS.CATCH_ALL],
    }) as Promise<DpaVersion[]>;
