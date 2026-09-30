import { tenantAdminEndpoint } from '../../appConfig';
import type { AccountInactivitySettings } from '../../types/AccountInactivitySettings';
import { FETCH_ERRORS, FETCH_METHODS, FETCH_SUCCESS, fetchData } from '../fetchData';

const url = `${tenantAdminEndpoint}/controls/account-inactivity`;
const responseHandling = [
    FETCH_ERRORS.BAD_REQUEST,
    FETCH_ERRORS.CONFLICT,
    FETCH_ERRORS.FORBIDDEN,
    FETCH_ERRORS.CATCH_ALL_SILENT,
];

export const getAccountInactivitySettings = () =>
    fetchData({
        url,
        method: FETCH_METHODS.GET,
        skipAuth: false,
        responseHandling,
    }) as Promise<AccountInactivitySettings>;

export const updateAccountInactivitySettings = (settings: AccountInactivitySettings) =>
    fetchData({
        url,
        method: FETCH_METHODS.PUT,
        skipAuth: false,
        bodyData: JSON.stringify(settings),
        responseHandling: [...responseHandling, FETCH_SUCCESS.CONTENT],
    }) as Promise<AccountInactivitySettings>;
