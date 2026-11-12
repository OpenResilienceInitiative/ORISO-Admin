import { addonServiceURL, CSRF_WHITELIST_HEADER } from '../appConfig';
import { getAccessTokenForRequests } from '../api/auth/auth';
import generateCsrfToken from '../utils/generateCsrfToken';
import type { AvailableAddon } from './addonTypes';

interface AddonApiCallOptions {
    baseUrl?: string;
    token?: () => string | null | undefined;
    csrfToken?: () => string;
}

/** The `api` function handed to an add-on: its own route, with the admin's bearer token and CSRF header. */
export const addonApiCall = (
    addon: Pick<AvailableAddon, 'apiBase'>,
    {
        baseUrl = addonServiceURL,
        token = getAccessTokenForRequests,
        csrfToken = () => generateCsrfToken(),
    }: AddonApiCallOptions = {},
) => {
    return (path: string, init: RequestInit = {}) => {
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
        const relative = path.startsWith('/') ? path : `/${path}`;
        return fetch(`${baseUrl}${addon.apiBase}${relative}`, {
            ...init,
            headers,
            credentials: 'include',
        });
    };
};
