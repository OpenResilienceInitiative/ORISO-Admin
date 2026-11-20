import { tenantAdminEndpoint } from '../../appConfig';
import decodeHTML from '../../utils/decodeHTML';
import { FETCH_ERRORS, FETCH_METHODS, fetchData } from '../fetchData';

/** The Träger with this number, or `null` when there is none the caller may see. */
export const findInviteTenant = async (id: number): Promise<{ id: number; name?: string } | null> => {
    try {
        const tenant = await fetchData({
            url: `${tenantAdminEndpoint}/${id}`,
            method: FETCH_METHODS.GET,
            skipAuth: false,
            responseHandling: [FETCH_ERRORS.NO_MATCH, FETCH_ERRORS.FORBIDDEN_SILENT, FETCH_ERRORS.CATCH_ALL_SILENT],
        });
        return tenant?.id != null ? { id: Number(tenant.id), name: decodeHTML(tenant.name || '') || undefined } : null;
    } catch {
        return null;
    }
};
