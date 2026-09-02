import routePathNames from '../../appConfig';
import { LoginData } from '../../types/loginData';

const authBffBasePath = `${routePathNames.root}/auth`;

export const authSetTokenEndpoint = `${authBffBasePath}/set-token`;
export const authClearTokenEndpoint = `${authBffBasePath}/clear-token`;
export const authSessionEndpoint = `${authBffBasePath}/session`;
export const authRefreshTokenEndpoint = `${authBffBasePath}/refresh-token`;

export type AuthTokenPayload = {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    refresh_expires_in?: number;
};

/**
 * Hard ceiling for every auth-BFF request (set/clear-token, refresh). The refresh is the ONE request in the app
 * with no other timeout in front of it, and `auth.ts` caches the in-flight refresh
 * promise for every concurrent caller — so a single hanging refresh used to freeze
 * every 401-retry in the tab forever (endless invite-send spinner on a dead session).
 * `fetchData`'s own default is 30s; the refresh must give up sooner so the original
 * request's retry-or-logout decision still happens within that window.
 */
export const AUTH_BFF_REQUEST_TIMEOUT_MS = 10_000;

const postJson = async (url: string, body: AuthTokenPayload): Promise<void> => {
    // Same abort guard as the refresh below: logout() awaits the clear-token
    // call (via invalidateAuthSession) BEFORE it may redirect to the login page,
    // and its module-level in-progress flag is never reset — an unbounded
    // request here stranded the user on the page with every retry swallowed.
    // No body is read on success, so the timer only needs to span the fetch.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), AUTH_BFF_REQUEST_TIMEOUT_MS);
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify(body),
            signal: controller.signal,
        });

        if (!response.ok) {
            throw new Error(`Auth BFF request failed: ${response.status}`);
        }
    } finally {
        clearTimeout(timer);
    }
};

export const setAuthTokensViaBff = async (payload: AuthTokenPayload): Promise<void> => {
    await postJson(authSetTokenEndpoint, payload);
};

export const clearAuthTokensViaBff = async (): Promise<void> => {
    await postJson(authClearTokenEndpoint, {});
};

export const bootstrapAuthSessionViaBff = async (): Promise<LoginData | null> => {
    const response = await fetch(authSessionEndpoint, {
        method: 'GET',
        credentials: 'include',
    });

    if (response.status === 204 || response.status === 401) {
        return null;
    }

    if (!response.ok) {
        throw new Error(`Auth session bootstrap failed: ${response.status}`);
    }

    return response.json();
};

export const refreshAuthTokensViaBff = async (): Promise<LoginData> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), AUTH_BFF_REQUEST_TIMEOUT_MS);

    try {
        const response = await fetch(authRefreshTokenEndpoint, {
            method: 'POST',
            credentials: 'include',
            signal: controller.signal,
        });

        if (!response.ok) {
            throw new Error('keycloakLogin');
        }

        // The timer must stay armed THROUGH the body read: a BFF that returns
        // headers but stalls mid-body would otherwise leave this promise — and
        // with it auth.ts's cached in-flight refresh — pending forever, which is
        // exactly the endless-spinner failure this timeout exists to prevent.
        // Aborting the signal also rejects an in-progress json() read.
        return await response.json();
    } finally {
        clearTimeout(timer);
    }
};
