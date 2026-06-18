import { runtimeConfig } from '../../config/runtimeConfig';
import { LANGUAGE_COOKIE_KEY } from '../../utils/language';
import { buildCookieAttributes } from './buildCookieAttributes';
import { isAuthTokenCookie } from './authCookieNames';

export const buildClientCookieAttributes = (): string =>
    buildCookieAttributes({
        cookieSecure: runtimeConfig.cookieSecure,
        cookieDomain: runtimeConfig.cookieDomain,
    });

export const setValueInCookie = (name: string, value: string): void => {
    if (isAuthTokenCookie(name)) {
        throw new Error(`Auth token cookies must be set via the auth BFF: ${name}`);
    }

    document.cookie = `${name}=${value}${buildClientCookieAttributes()}`;
};

export const deleteCookieByName = (name: string): void => {
    const domain = runtimeConfig.cookieDomain ? `; Domain=${runtimeConfig.cookieDomain}` : '';
    document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT${domain}`;
};

export const getValueFromCookie = (targetValue: string): string => {
    if (isAuthTokenCookie(targetValue)) {
        return '';
    }

    const targetName = `${targetValue}=`;
    const decodedCookie = decodeURIComponent(document.cookie);
    const ca = decodedCookie.split(';');

    for (let i = 0; i < ca.length; i += 1) {
        let c = ca[i];
        while (c.charAt(0) === ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(targetName) === 0) {
            return c.substring(targetName.length, c.length);
        }
    }

    return '';
};

export const removeAllCookies = (): void => {
    document.cookie.split(';').forEach((c) => {
        const name = c.trim().split('=')[0];
        if (runtimeConfig.cookiesAllowedList.includes(name) || name === LANGUAGE_COOKIE_KEY || isAuthTokenCookie(name)) {
            return;
        }

        deleteCookieByName(name);
    });
};
