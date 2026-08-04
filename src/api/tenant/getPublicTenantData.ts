import { fetchData, FETCH_METHODS, FETCH_ERRORS } from '../fetchData';
import { baseTenantPublicEndpoint } from '../../appConfig';
import getLocationVariables from '../../utils/getLocationVariables';
import { decodeTenantAsset } from '../../utils/decodeTenantAsset';
import { AppConfigInterface } from '../../types/AppConfigInterface';

const BRANDING_ASSETS = ['logo', 'favicon', 'associationLogo'] as const;

/**
 * TenantService HTML-encodes every stored string, so a base64 branding asset
 * comes back with `+`/`=` as `&#43;`/`&#61;` and is not a decodable data URL
 * (see {@link decodeTenantAsset}). Decoding here — at the ONE seam every public
 * consumer reads through — is what makes the tenant logo appear on the sign-in
 * stage and the tenant favicon in the browser tab. Doing it per consumer is how
 * it got missed: the admin's upload preview decoded, the public surfaces did not.
 */
const decodeBrandingAssets = (result: any) => {
    if (!result?.theming) {
        return result;
    }

    const theming = { ...result.theming };
    BRANDING_ASSETS.forEach((asset) => {
        if (typeof theming[asset] === 'string') {
            theming[asset] = decodeTenantAsset(theming[asset]);
        }
    });

    return { ...result, theming };
};

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
                return decodeBrandingAssets(result);
            })
            .catch((error) => {
                // console.error('🔍 getPublicTenantData: ERROR:', error);
                throw error;
            });
    }

    return Promise.resolve(null);
};

export default getPublicTenantData;
