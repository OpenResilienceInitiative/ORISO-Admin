import { FETCH_ERRORS, FETCH_METHODS, fetchData } from '../fetchData';
import { agencyAdminEndpoint } from '../../appConfig';
import {
    accountOperationHeaders,
    settleAccountOperation,
    type AccountOperationIntent,
} from '../../utils/accountOperationIntent';

/**
 * delete admin
 * @param id
 * @return data
 */
export const deleteAgencyAdminData = (id: string, intent?: AccountOperationIntent) => {
    const url = `${agencyAdminEndpoint}/${id}`;
    return settleAccountOperation(
        intent,
        fetchData({
            url,
            headersData: accountOperationHeaders(intent, FETCH_METHODS.DELETE, url),
            method: FETCH_METHODS.DELETE,
            skipAuth: false,
            responseHandling: [
                FETCH_ERRORS.BAD_REQUEST_WITH_RESPONSE,
                FETCH_ERRORS.FORBIDDEN_WITH_RESPONSE,
                FETCH_ERRORS.CONFLICT_WITH_RESPONSE,
                FETCH_ERRORS.CATCH_ALL_SILENT,
            ],
        }),
    );
};
