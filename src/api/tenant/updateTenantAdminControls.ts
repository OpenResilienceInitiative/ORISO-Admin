import { tenantAdminEndpoint } from '../../appConfig';
import { TenantAdminControls } from '../../types/TenantAdminControls';
import { FETCH_ERRORS, FETCH_METHODS, fetchData } from '../fetchData';

export const updateTenantAdminControls = (body: TenantAdminControls) =>
    fetchData({
        url: `${tenantAdminEndpoint}/controls`,
        method: FETCH_METHODS.PUT,
        skipAuth: false,
        bodyData: JSON.stringify(body),
        responseHandling: [FETCH_ERRORS.CATCH_ALL],
    }) as Promise<TenantAdminControls>;
