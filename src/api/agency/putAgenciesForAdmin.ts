import { AccountOperationIntent, accountOperationHeaders } from '../../utils/accountOperationIntent';
import { agencyAdminEndpoint } from '../../appConfig';

import { FETCH_ERRORS, FETCH_METHODS, fetchData } from '../fetchData';

export const DEFAULT_ROLE = 'ADMIN_DEFAULT';

/**
 * retrieve all needed agency data
 * @return {Promise}
 */
export const putAgenciesForAgencyAdmin = (
    adminId: string,
    agencyIds: string[],
    operationIntent?: AccountOperationIntent,
) => {
    const agencies = agencyIds.map((agencyId) => ({
        agencyId,
        role: DEFAULT_ROLE,
    }));

    const bodyData = JSON.stringify(agencies);
    const url = `${agencyAdminEndpoint}/${adminId}/agencies`;
    return fetchData({
        url,
        headersData: accountOperationHeaders(operationIntent, FETCH_METHODS.PUT, url, bodyData),
        method: FETCH_METHODS.PUT,
        skipAuth: false,
        responseHandling: [FETCH_ERRORS.CATCH_ALL_SILENT],
        bodyData,
    });
};
