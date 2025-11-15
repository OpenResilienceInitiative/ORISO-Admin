import { FETCH_ERRORS, FETCH_METHODS, fetchData } from '../fetchData';
import { tenantEndpoint } from '../../appConfig';

/**
 * delete tenant
 * @param string
 * @return data
 */
export const deleteTenantData = (id: number) => {
    const tenant = fetchData({
        url: `${tenantEndpoint}/${id}`,
        method: FETCH_METHODS.DELETE,
        skipAuth: false,
        responseHandling: [FETCH_ERRORS.NOT_ALLOWED],
    });

    return tenant;
};
