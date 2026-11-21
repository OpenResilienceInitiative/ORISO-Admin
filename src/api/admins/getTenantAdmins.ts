import { tenantAdminsEndpoint } from '../../appConfig';
import { FETCH_ERRORS, FETCH_METHODS, fetchData } from '../fetchData';

/** One Tenant-Unit admin, as returned by MT-04-08 `GET /useradmin/tenantadmins?tenantId=`. */
export interface TenantUnitAdmin {
    id: string;
    firstname: string;
    lastname: string;
    email: string;
}

/**
 * Every admin of one Tenant-Unit. The backend already allows several equal admins
 * on the same tenant (UserService#22 / PR #67).
 */
export const getTenantAdmins = async (tenantId: string | number): Promise<TenantUnitAdmin[]> => {
    const data = await fetchData({
        url: `${tenantAdminsEndpoint}?tenantId=${encodeURIComponent(String(tenantId))}`,
        method: FETCH_METHODS.GET,
        skipAuth: false,
        responseHandling: [FETCH_ERRORS.CATCH_ALL],
    });

    return Array.isArray(data) ? data : [];
};
