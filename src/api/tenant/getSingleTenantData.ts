import { tenantAdminEndpoint } from '../../appConfig';
import decodeHTML from '../../utils/decodeHTML';
import { FETCH_ERRORS, FETCH_METHODS, fetchData } from '../fetchData';

/**
 * retrieve tenant data
 * @return {Promise}
 */
export const getSingleTenantData = (
    id: string | number,
    { silent = false, keepPageOnError = false }: { silent?: boolean; keepPageOnError?: boolean } = {},
) => {
    const failureHandling = silent ? FETCH_ERRORS.CATCH_ALL_SILENT : FETCH_ERRORS.CATCH_ALL;
    // retrieve Tenants
    return fetchData({
        url: `${tenantAdminEndpoint}/${id}`,
        method: FETCH_METHODS.GET,
        skipAuth: false,
        // `silent`: the caller reports the failure itself (no second toast).
        // A recovery read must also leave the current page and its draft intact on auth failures.
        responseHandling: [keepPageOnError ? FETCH_ERRORS.LOCAL_FAILURE_WITH_RESPONSE : failureHandling],
    }).then((data) => ({
        ...data,
        name: decodeHTML(data?.name || ''),
    }));
};
