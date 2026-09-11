import { tenantAdminEndpoint } from '../../appConfig';
import { DpiaMasterData } from '../../types/dpiaMasterData';
import { FETCH_ERRORS, FETCH_METHODS, fetchData } from '../fetchData';

/** Replaces the platform DPIA operator master data (`PUT /tenantadmin/dpia`, superadmin only). */
export const updateDpiaMasterData = (body: DpiaMasterData) =>
    fetchData({
        url: `${tenantAdminEndpoint}/dpia`,
        method: FETCH_METHODS.PUT,
        skipAuth: false,
        bodyData: JSON.stringify(body),
        responseHandling: [FETCH_ERRORS.CATCH_ALL],
    }) as Promise<DpiaMasterData>;
