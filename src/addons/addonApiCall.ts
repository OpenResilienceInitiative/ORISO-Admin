import { addonServiceURL, CSRF_WHITELIST_HEADER } from '../appConfig';
import { getAccessTokenForRequests, tryRefreshAccessToken } from '../api/auth/auth';
import generateCsrfToken from '../utils/generateCsrfToken';
import type { AvailableAddon } from './addonTypes';

interface AddonApiCallOptions {
    baseUrl?: string;
    token?: () => string | null | undefined;
    csrfToken?: () => string;
    refreshToken?: () => Promise<boolean>;
}

/**
 * The `api` function handed to an add-on: its own route, with the admin's bearer token and CSRF header.
 * A 401 refreshes the session once and repeats the request, like `fetchData`.
 */
export const addonApiCall = (
    addon: Pick<AvailableAddon, 'apiBase'>,
    {
        baseUrl = addonServiceURL,
        token = getAccessTokenForRequests,
        csrfToken = () => generateCsrfToken(),
        refreshToken = tryRefreshAccessToken,
    }: AddonApiCallOptions = {},
) => {
    const send = (url: string, init: RequestInit) => {
        const headers = new Headers(init.headers);
        const accessToken = token();
        if (accessToken) {
            headers.set('Authorization', `Bearer ${accessToken}`);
        }
        const csrf = csrfToken();
        headers.set('X-CSRF-TOKEN', csrf);
        if (import.meta.env.DEV && CSRF_WHITELIST_HEADER) {
            headers.set(CSRF_WHITELIST_HEADER, csrf);
        }
        return fetch(url, { ...init, headers, credentials: 'include' });
    };

    return async (path: string, init: RequestInit = {}) => {
        const relative = path.startsWith('/') ? path : `/${path}`;
        const url = `${baseUrl}${addon.apiBase}${relative}`;
        const response = await send(url, init);
        if (response.status !== 401 || !(await refreshToken())) {
            return response;
        }
        return send(url, init);
    };
};
