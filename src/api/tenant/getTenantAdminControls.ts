import { tenantAdminEndpoint } from '../../appConfig';
import { TenantAdminControls } from '../../types/TenantAdminControls';
import { FETCH_ERRORS, FETCH_METHODS, fetchData } from '../fetchData';

export const getTenantAdminControls = () =>
    fetchData({
        url: `${tenantAdminEndpoint}/controls`,
        method: FETCH_METHODS.GET,
        skipAuth: false,
        responseHandling: [FETCH_ERRORS.CATCH_ALL],
    }) as Promise<TenantAdminControls>;
