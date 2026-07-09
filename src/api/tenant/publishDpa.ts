import { tenantAdminEndpoint } from '../../appConfig';
import { DpaGateStatus } from '../../types/dpa';
import { FETCH_ERRORS, FETCH_METHODS, fetchData } from '../fetchData';

/** Publishes the tenant DPA (per-language HTML map) and stamps a new version. */
export const publishDpa = (tenantId: number, contentByLanguage: Record<string, string>) =>
    fetchData({
        url: `${tenantAdminEndpoint}/${tenantId}/dpa`,
        method: FETCH_METHODS.PUT,
        skipAuth: false,
        bodyData: JSON.stringify(contentByLanguage),
        responseHandling: [FETCH_ERRORS.CATCH_ALL],
    }) as Promise<DpaGateStatus>;
