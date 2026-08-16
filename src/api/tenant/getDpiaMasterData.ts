import { tenantAdminEndpoint } from '../../appConfig';
import { DpiaMasterData } from '../../types/dpiaMasterData';
import { FETCH_ERRORS, FETCH_METHODS, fetchData } from '../fetchData';

/** Reads the platform DPIA operator master data (`GET /tenantadmin/dpia`, superadmin only). */
export const getDpiaMasterData = () =>
    fetchData({
        url: `${tenantAdminEndpoint}/dpia`,
        method: FETCH_METHODS.GET,
        skipAuth: false,
        responseHandling: [FETCH_ERRORS.CATCH_ALL],
    }) as Promise<DpiaMasterData>;
