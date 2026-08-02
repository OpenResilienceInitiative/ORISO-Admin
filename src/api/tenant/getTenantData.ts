import { fetchData, FETCH_ERRORS, FETCH_METHODS } from '../fetchData';
import { tenantEndpoint } from '../../appConfig';
import { TenantData } from '../../types/tenant';
import { getAccessTokenForRequests } from '../auth/auth';
import parseJwt from '../../utils/parseJWT';

/**
 * retrieve all needed tenant data
 * @return data
 */
const getTenantData = (tenantData: TenantData, useMultiTenancyWithSingleDomain: boolean) => {
    // console.log('🔍 getTenantData: Starting...');
    // console.log('🔍 getTenantData: tenantData:', tenantData);
    // console.log('🔍 getTenantData: useMultiTenancyWithSingleDomain:', useMultiTenancyWithSingleDomain);

    const accessToken = getAccessTokenForRequests();
    // console.log('🔍 getTenantData: accessToken exists:', !!accessToken);

    let tenantId = tenantData.id;
    // console.log('🔍 getTenantData: Initial tenantId:', tenantId);

    if (useMultiTenancyWithSingleDomain && accessToken) {
        const access = parseJwt(accessToken || '');
        // console.log('🔍 getTenantData: Parsed JWT access:', access);
        let tokenTenantId: number | null = null;
        if (typeof access?.tenantId === 'number') {
            tokenTenantId = access.tenantId;
        } else if (typeof access?.tenantId === 'string' && access.tenantId.trim() !== '') {
            tokenTenantId = Number(access.tenantId);
        }
        // Super-admin / technical tokens use tenantId=0 (global scope), but
        // /service/tenant/0 does not exist. Keep public-tenant id in that case.
        if (tokenTenantId !== null && tokenTenantId > 0) {
            tenantId = tokenTenantId;
        }
        // console.log('🔍 getTenantData: Final tenantId after JWT parsing:', tenantId);
    }

    const url = `${tenantEndpoint}${tenantId}`;
    // console.log('🔍 getTenantData: Fetching URL:', url);

    return fetchData({
        url,
        method: FETCH_METHODS.GET,
        skipAuth: false,
        // A Global Support Admin administers no tenant, so this call is legitimately forbidden for
        // it. Without the opt-out the global 403 handler would bounce the whole tab to
        // access-denied on every page load; the caller already renders a harmless fallback.
        responseHandling: [FETCH_ERRORS.FORBIDDEN_SILENT],
    })
        .then((response: any) => {
            // console.log('🔍 getTenantData: Raw response:', response);

            const checkNull = (value: string | null) => (!value ? '' : value);
            const result = {
                ...response,
                impressum: checkNull(response.impressum),
                privacy: checkNull(response.privacy),
                termsAndConditions: checkNull(response.termsAndConditions),
                secondaryColor: checkNull(response.secondaryColor),
                // NEW optional shared API fields
                address: checkNull(response.address),
                description: checkNull(response.description),
            };

            // console.log('🔍 getTenantData: SUCCESS - Final result:', result);
            return result;
        })
        .catch((error) => {
            // console.error('🔍 getTenantData: ERROR:', error);
            throw error;
        });
};

export default getTenantData;
