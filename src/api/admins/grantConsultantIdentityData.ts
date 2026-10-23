import { FETCH_ERRORS, FETCH_METHODS, fetchData } from '../fetchData';
import { grantConsultantIdentityEndpoint } from '../../appConfig';
import {
    type AccountOperationIntent,
    accountOperationHeaders,
    settleAccountOperation,
} from '../../utils/accountOperationIntent';

export interface GrantConsultantIdentityInput {
    isGroupchatConsultant?: boolean;
    absent?: boolean;
    absenceMessage?: string;
    formalLanguage?: boolean;
    agencyIds?: string[];
    topicIds?: string[];
}

/**
 * Grant an existing agency-admin / tenant-admin an additional consultant identity.
 * Calls POST /service/useradmin/admins/{adminId}/grant-consultant-identity.
 *
 * @param adminId - id of the admin who should also become a consultant
 * @param input - consultant identity payload
 * @return the raw fetch response
 */
export const grantConsultantIdentityData = (
    adminId: string,
    input: GrantConsultantIdentityInput,
    operationIntent?: AccountOperationIntent,
): Promise<Response> => {
    const { isGroupchatConsultant, absent, absenceMessage, formalLanguage, agencyIds, topicIds } = input;

    const url = grantConsultantIdentityEndpoint(adminId);
    const bodyData = JSON.stringify({
        isGroupchatConsultant: !!isGroupchatConsultant,
        absent: !!absent,
        ...(absenceMessage ? { absenceMessage } : {}),
        formalLanguage: !!formalLanguage,
        agencyIds: agencyIds || [],
        topicIds: topicIds || [],
    });
    return settleAccountOperation(
        operationIntent,
        fetchData({
            url,
            headersData: accountOperationHeaders(operationIntent, FETCH_METHODS.POST, url, bodyData),
            method: FETCH_METHODS.POST,
            skipAuth: false,
            responseHandling: [
                FETCH_ERRORS.BAD_REQUEST_WITH_RESPONSE,
                FETCH_ERRORS.CONFLICT_WITH_RESPONSE,
                FETCH_ERRORS.CATCH_ALL,
            ],
            bodyData,
        }),
    );
};
