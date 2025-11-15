import { FETCH_ERRORS, FETCH_METHODS, fetchData } from '../fetchData';
import { tenantEndpoint } from '../../appConfig';

/**
 * add new tenant
 * @param tenantData
 * @return data
 */
const addTenantData = (tenantData: Record<string, any>) => {
    const {
        name,
        subdomain,
        createDate,
        allowedNumberOfUsers,
        settings,
        formalLanguage,
        consultingType,
        twoFactorAuth,
        videoFeature,
    } = tenantData;

    // just use needed data from whole form data
    const strippedTenant = {
        name,
        subdomain,
        createDate,
        licensing: { allowedNumberOfUsers },
        settings,
        formalLanguage,
        consultingType,
        twoFactorAuth,
        videoFeature,
    };

    return fetchData({
        url: tenantEndpoint,
        method: FETCH_METHODS.POST,
        skipAuth: false,
        responseHandling: [FETCH_ERRORS.CATCH_ALL],
        bodyData: JSON.stringify(strippedTenant),
    }).then((response) => {
        if (response.status === 200) {
            return response.json();
        }
        return response.json();
    });
};

export default addTenantData;
