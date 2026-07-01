import { tenantAdminEndpoint } from '../../appConfig';
import { DpaVersion } from '../../types/dpa';
import { FETCH_ERRORS, FETCH_METHODS, fetchData } from '../fetchData';

/** Published DPA versions for a tenant, newest first. */
export const getDpaVersions = (tenantId: number) =>
    fetchData({
        url: `${tenantAdminEndpoint}/${tenantId}/dpa/versions`,
        method: FETCH_METHODS.GET,
        skipAuth: false,
        responseHandling: [FETCH_ERRORS.CATCH_ALL],
    }) as Promise<DpaVersion[]>;
