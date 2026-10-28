import { FETCH_ERRORS, FETCH_METHODS, fetchData } from '../fetchData';
import { grantConsultantIdentityEndpoint } from '../../appConfig';
import {
    type AccountOperationIntent,
    accountOperationHeaders,
    settleAccountOperation,
    hasVerifiedAccountOperationRefusal,
} from '../../utils/accountOperationIntent';
import { observedAccountOperationStatus } from '../../utils/accountOperationState';
import { accountOperationOwner } from '../../utils/accountOperationOwner';
import { tryRefreshAccessToken } from '../auth/auth';
import { getSessionAccessToken } from '../auth/tokenSessionStore';
import parseJwt from '../../utils/parseJWT';

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
export const grantConsultantIdentityData = async (
    adminId: string,
    input: GrantConsultantIdentityInput,
    operationIntent?: AccountOperationIntent,
    options: { recoverOwnGrant?: boolean } = {},
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
    const initialToken = getSessionAccessToken();
    const initialOwner = accountOperationOwner(initialToken);
    const ownGrant =
        options.recoverOwnGrant === true && !!operationIntent && parseJwt(initialToken ?? '')?.sub === adminId;
    const request = {
        url,
        headersData: accountOperationHeaders(operationIntent, FETCH_METHODS.POST, url, bodyData),
        method: FETCH_METHODS.POST,
        skipAuth: false,
        responseHandling: [
            FETCH_ERRORS.BAD_REQUEST_WITH_RESPONSE,
            FETCH_ERRORS.FORBIDDEN_WITH_RESPONSE,
            FETCH_ERRORS.CONFLICT_WITH_RESPONSE,
            FETCH_ERRORS.CATCH_ALL_SILENT,
        ],
        bodyData,
    };
    const send = () => settleAccountOperation(operationIntent, fetchData(request));
    try {
        return await send();
    } catch (error) {
        if (
            !ownGrant ||
            hasVerifiedAccountOperationRefusal(error) ||
            ![403, 503].includes(observedAccountOperationStatus(error) ?? 0)
        )
            throw error;
        // Native self-grant can commit before the reply is lost. A fresh token
        // sees its changed roles; only the original receipt replay settles it.
        if (!(await tryRefreshAccessToken())) throw error;
        if (accountOperationOwner(getSessionAccessToken()) !== initialOwner)
            throw new Error(FETCH_ERRORS.REQUEST_IDENTITY_CHANGED);
        return send();
    }
};
