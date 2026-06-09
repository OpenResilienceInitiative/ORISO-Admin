import { fetchData, FETCH_METHODS, FETCH_ERRORS } from '../fetchData';
import { baseTenantPublicEndpoint } from '../../appConfig';
import getLocationVariables from '../../utils/getLocationVariables';
import { AppConfigInterface } from '../../types/AppConfigInterface';

/**
 * retrieve all needed public tenant data
 * @return data
 */
const getPublicTenantData = (settings: AppConfigInterface) => {
    // console.log('🔍 getPublicTenantData: Starting...');
    // console.log('🔍 getPublicTenantData: Settings:', settings);

    const { subdomain } = getLocationVariables();
    // console.log('🔍 getPublicTenantData: Subdomain from location:', subdomain);

    const slug = settings.multitenancyWithSingleDomainEnabled
        ? settings.mainTenantSubdomainForSingleDomainMultitenancy
        : subdomain;

    // console.log('🔍 getPublicTenantData: Slug to use:', slug);
    // console.log(
    // '🔍 getPublicTenantData: multitenancyWithSingleDomainEnabled:',
    // settings.multitenancyWithSingleDomainEnabled,
    // );

    if (slug) {
        const url = `${baseTenantPublicEndpoint}/${slug}`;
        // console.log('🔍 getPublicTenantData: Fetching URL:', url);

        return fetchData({
            url,
            method: FETCH_METHODS.GET,
            skipAuth: true,
            responseHandling: [FETCH_ERRORS.NO_MATCH],
        })
            .then((result) => {
                // console.log('🔍 getPublicTenantData: SUCCESS - Result:', result);
                return result;
            })
            .catch((error) => {
                // console.error('🔍 getPublicTenantData: ERROR:', error);
                throw error;
            });
    }

    // console.log('🔍 getPublicTenantData: No slug, returning empty promise');
    const error = new Error('No tenant slug available');
    error.name = 'NoTenantSlug';
    return Promise.reject(error);
};

export default getPublicTenantData;
