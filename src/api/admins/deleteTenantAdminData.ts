import { FETCH_ERRORS, FETCH_METHODS, fetchData } from '../fetchData';
import { tenantAdminsEndpoint } from '../../appConfig';
import {
    accountOperationHeaders,
    settleAccountOperation,
    type AccountOperationIntent,
} from '../../utils/accountOperationIntent';

export const deleteTenantAdminData = (id: string, intent?: AccountOperationIntent): Promise<void> => {
    const url = `${tenantAdminsEndpoint}/${id}`;
    return settleAccountOperation(
        intent,
        fetchData({
            url,
            method: FETCH_METHODS.DELETE,
            headersData: accountOperationHeaders(intent, FETCH_METHODS.DELETE, url),
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
