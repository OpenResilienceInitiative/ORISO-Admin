import { FETCH_ERRORS, FETCH_METHODS, fetchData } from '../fetchData';
import { tenantEndpoint } from '../../appConfig';

/**
 * Build the stripped create payload from whole form data.
 *
 * Pure function (no side effects) so it can be unit-tested without a DOM /
 * network. Includes the NEW optional top-level `address` and `description`
 * fields and deliberately EXCLUDES the frontend-only `topic` field (the
 * backend has no `topic` column).
 */
export const buildTenantCreatePayload = (tenantData: Record<string, any>) => {
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
        address,
        description,
    } = tenantData;

    // just use needed data from whole form data
    return {
        name,
        subdomain,
        createDate,
        licensing: { allowedNumberOfUsers },
        settings,
        formalLanguage,
        consultingType,
        twoFactorAuth,
        videoFeature,
        address,
        description,
    };
};

/**
 * add new tenant
 * @param tenantData
 * @return data
 */
const addTenantData = (tenantData: Record<string, any>) => {
    const strippedTenant = buildTenantCreatePayload(tenantData);

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
