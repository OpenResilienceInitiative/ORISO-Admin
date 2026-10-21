import {
    AccountOperationIntent,
    accountOperationHeaders,
    settleAccountOperation,
} from '../../utils/accountOperationIntent';
import { twoFactorAuthApp, twoFactorAuthAppEmail, userDataEndpoint, twoFactorAuth } from '../../appConfig';
import { fetchData, FETCH_ERRORS, FETCH_METHODS } from '../fetchData';

export const apiPutTwoFactorAuthApp = async (
    body: { secret: string; otp: string },
    operationIntent?: AccountOperationIntent,
): Promise<any> => {
    const url = twoFactorAuthApp;
    const bodyData = JSON.stringify(body);

    return settleAccountOperation(
        operationIntent,
        fetchData({
            url,
            method: FETCH_METHODS.PUT,
            bodyData,
            headersData: accountOperationHeaders(operationIntent, FETCH_METHODS.PUT, url, bodyData),
            responseHandling: [FETCH_ERRORS.BAD_REQUEST],
        }),
    );
};

export const apiPutTwoFactorAuthEmail = async (
    email: string,
    operationIntent?: AccountOperationIntent,
): Promise<any> => {
    const url = twoFactorAuthAppEmail;
    const bodyData = JSON.stringify({ email });

    return settleAccountOperation(
        operationIntent,
        fetchData({
            url,
            method: FETCH_METHODS.PUT,
            bodyData,
            headersData: accountOperationHeaders(operationIntent, FETCH_METHODS.PUT, url, bodyData),
            responseHandling: [FETCH_ERRORS.BAD_REQUEST, FETCH_ERRORS.PRECONDITION_FAILED],
        }),
    );
};

export const apiPatchTwoFactorAuthEncourage = async (isToEncourage: boolean): Promise<any> => {
    const url = userDataEndpoint;

    return fetchData({
        url,
        method: FETCH_METHODS.PATCH,
        bodyData: JSON.stringify({ encourage2fa: isToEncourage }),
        responseHandling: [FETCH_ERRORS.BAD_REQUEST],
    });
};

export const apiPostTwoFactorAuthEmailWithCode = async (
    code: string,
    operationIntent?: AccountOperationIntent,
): Promise<any> => {
    const url = `${twoFactorAuthAppEmail}/validate/${code}`;

    return settleAccountOperation(
        operationIntent,
        fetchData({
            url,
            method: FETCH_METHODS.POST,
            headersData: accountOperationHeaders(operationIntent, FETCH_METHODS.POST, url),
            responseHandling: [FETCH_ERRORS.BAD_REQUEST],
        }),
    );
};

export const apiDeleteTwoFactorAuth = async (operationIntent?: AccountOperationIntent): Promise<any> => {
    const url = twoFactorAuth;

    return settleAccountOperation(
        operationIntent,
        fetchData({
            url,
            method: FETCH_METHODS.DELETE,
            headersData: accountOperationHeaders(operationIntent, FETCH_METHODS.DELETE, url),
        }),
    );
};
