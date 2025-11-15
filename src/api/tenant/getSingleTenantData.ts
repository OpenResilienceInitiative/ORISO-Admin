import { tenantAdminEndpoint } from '../../appConfig';
import decodeHTML from '../../utils/decodeHTML';
import { FETCH_ERRORS, FETCH_METHODS, fetchData } from '../fetchData';

/**
 * retrieve tenant data
 * @return {Promise}
 */
export const getSingleTenantData = (id: string | number) => {
    // retrieve Tenants
    return fetchData({
        url: `${tenantAdminEndpoint}/${id}`,
        method: FETCH_METHODS.GET,
        skipAuth: false,
        responseHandling: [FETCH_ERRORS.CATCH_ALL],
    }).then((data) => ({
        ...data,
        name: decodeHTML(data?.name || ''),
    }));
};
