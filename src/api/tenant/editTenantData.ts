import { TenantData } from '../../types/tenant';
import { FETCH_ERRORS, FETCH_METHODS, fetchData } from '../fetchData';
import { tenantEndpoint } from '../../appConfig';

/**
 * retrieve all needed tenant data
 * @param tenantData
 * @return data
 */
const editTenantData = (tenantData: TenantData) =>
    fetchData({
        url: `${tenantEndpoint}${tenantData.id}`,
        method: FETCH_METHODS.PUT,
        skipAuth: false,
        responseHandling: [FETCH_ERRORS.CATCH_ALL],
        bodyData: JSON.stringify(tenantData),
    }).then((response) => response.json());

export default editTenantData;
