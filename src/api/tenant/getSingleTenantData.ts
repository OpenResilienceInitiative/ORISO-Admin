import { tenantAdminEndpoint } from '../../appConfig';
import decodeHTML from '../../utils/decodeHTML';
import { FETCH_ERRORS, FETCH_METHODS, fetchData } from '../fetchData';

/**
 * retrieve tenant data
 * @return {Promise}
 */
export const getSingleTenantData = (id: string | number, { silent = false }: { silent?: boolean } = {}) => {
    // retrieve Tenants
    return fetchData({
        url: `${tenantAdminEndpoint}/${id}`,
        method: FETCH_METHODS.GET,
        skipAuth: false,
        // `silent`: the caller reports the failure itself (no second toast).
        responseHandling: [silent ? FETCH_ERRORS.CATCH_ALL_SILENT : FETCH_ERRORS.CATCH_ALL],
    }).then((data) => ({
        ...data,
        name: decodeHTML(data?.name || ''),
    }));
};
