import { fetchData, FETCH_METHODS } from '../fetchData';
import { tenantEndpoint } from '../../appConfig';
import { TenantData } from '../../types/tenant';
import { getValueFromCookie } from '../auth/accessSessionCookie';
import parseJwt from '../../utils/parseJWT';

/**
 * retrieve all needed tenant data
 * @return data
 */
const getTenantData = (tenantData: TenantData, useMultiTenancyWithSingleDomain: boolean) => {
    console.log('🔍 getTenantData: Starting...');
    console.log('🔍 getTenantData: tenantData:', tenantData);
    console.log('🔍 getTenantData: useMultiTenancyWithSingleDomain:', useMultiTenancyWithSingleDomain);

    const accessToken = getValueFromCookie('keycloak');
    console.log('🔍 getTenantData: accessToken exists:', !!accessToken);

    let tenantId = tenantData.id;
    console.log('🔍 getTenantData: Initial tenantId:', tenantId);

    if (useMultiTenancyWithSingleDomain && accessToken) {
        const access = parseJwt(accessToken || '');
        console.log('🔍 getTenantData: Parsed JWT access:', access);
        tenantId = access?.tenantId || tenantId;
        console.log('🔍 getTenantData: Final tenantId after JWT parsing:', tenantId);
    }

    const url = `${tenantEndpoint}${tenantId}`;
    console.log('🔍 getTenantData: Fetching URL:', url);

    return fetchData({
        url,
        method: FETCH_METHODS.GET,
        skipAuth: false,
        responseHandling: [],
    })
        .then((response: any) => {
            console.log('🔍 getTenantData: Raw response:', response);

            const checkNull = (value: string | null) => (!value ? '' : value);
            const result = {
                ...response,
                impressum: checkNull(response.impressum),
                privacy: checkNull(response.privacy),
                termsAndConditions: checkNull(response.termsAndConditions),
                secondaryColor: checkNull(response.secondaryColor),
            };

            console.log('🔍 getTenantData: SUCCESS - Final result:', result);
            return result;
        })
        .catch((error) => {
            console.error('🔍 getTenantData: ERROR:', error);
            throw error;
        });
};

export default getTenantData;
