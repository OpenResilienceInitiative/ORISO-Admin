import { FETCH_ERRORS, FETCH_METHODS, fetchData } from '../fetchData';
import { passwordResetConfirmEndpoint, passwordResetRequestEndpoint } from '../../appConfig';

export const requestAdminPasswordReset = (username: string, locale: string) =>
    fetchData({
        url: passwordResetRequestEndpoint,
        method: FETCH_METHODS.POST,
        skipAuth: true,
        bodyData: JSON.stringify({ username, locale, application: 'ADMIN' }),
    });

export const confirmAdminPasswordReset = (token: string, newPassword: string) =>
    fetchData({
        url: passwordResetConfirmEndpoint,
        method: FETCH_METHODS.POST,
        skipAuth: true,
        bodyData: JSON.stringify({ token, newPassword }),
        responseHandling: [FETCH_ERRORS.BAD_REQUEST, FETCH_ERRORS.CATCH_ALL_SILENT],
    });
