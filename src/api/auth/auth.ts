import logout from './logout';
import { bootstrapAuthSessionViaBff, refreshAuthTokensViaBff, setAuthTokensViaBff } from './authBffClient';
import {
    ACCESS_TOKEN_VALID_UNTIL_KEY,
    REFRESH_TOKEN_VALID_UNTIL_KEY,
    getTokenExpiryFromLocalStorage,
    setTokenExpiryInLocalStorage,
} from './accessSessionLocalStorage';
import { getSessionAccessToken, getSessionRefreshToken, hasSessionTokens, setSessionTokens } from './tokenSessionStore';

import parseJwt from '../../utils/parseJWT';

const resolveExpiresInSeconds = (token: string | undefined, expiresIn?: number): number | undefined => {
    if (expiresIn) {
        return expiresIn;
    }

    if (!token) {
        return undefined;
    }

    try {
        const payload = parseJwt(token);
        if (typeof payload?.exp === 'number') {
            return Math.max(payload.exp - Math.floor(Date.now() / 1000), 0);
        }
    } catch {
        return undefined;
    }

    return undefined;
};

export const RENEW_BEFORE_EXPIRY_IN_MS = 10 * 1000; // seconds

export const setTokens = async (
    access_token: string | undefined,
    expires_in: number | undefined,
    refresh_token: string | undefined,
    refresh_expires_in: number | undefined,
): Promise<void> => {
    setSessionTokens(access_token || null, refresh_token || null);

    if (access_token) {
        setTokenExpiryInLocalStorage(ACCESS_TOKEN_VALID_UNTIL_KEY, expires_in);
    }
    if (refresh_token) {
        setTokenExpiryInLocalStorage(REFRESH_TOKEN_VALID_UNTIL_KEY, refresh_expires_in);
    }

    await setAuthTokensViaBff({
        access_token,
        refresh_token,
        expires_in,
        refresh_expires_in,
    });
};

let inflightTokenRefresh: Promise<boolean> | null = null;

/**
 * Refresh the access/refresh token via the BFF and repopulate the in-memory token
 * store. Concurrent callers share a single in-flight refresh. Resolves to `true`
 * when a fresh token was obtained, `false` otherwise (e.g. the refresh token is
 * gone or already expired). The caller decides what to do on failure. Used by
 * the renewal timer and by fetchData to self-heal a single 401 before logout.
 */
export const tryRefreshAccessToken = (): Promise<boolean> => {
    if (inflightTokenRefresh) {
        return inflightTokenRefresh;
    }

    inflightTokenRefresh = refreshAuthTokensViaBff()
        .then((response) => {
            if (!response?.access_token || !response.refresh_token) {
                return false;
            }

            setSessionTokens(response.access_token, response.refresh_token);
            setTokenExpiryInLocalStorage(
                ACCESS_TOKEN_VALID_UNTIL_KEY,
                resolveExpiresInSeconds(response.access_token, response.expires_in),
            );
            setTokenExpiryInLocalStorage(
                REFRESH_TOKEN_VALID_UNTIL_KEY,
                resolveExpiresInSeconds(response.refresh_token, response.refresh_expires_in),
            );

            return true;
        })
        .catch(() => false)
        .finally(() => {
            inflightTokenRefresh = null;
        });

    return inflightTokenRefresh;
};

let accessRefreshInterval: number | undefined;
let refreshExpiryTimeout: number | undefined;

const stopTimers = () => {
    if (accessRefreshInterval !== undefined) {
        window.clearInterval(accessRefreshInterval);
        accessRefreshInterval = undefined;
    }
    if (refreshExpiryTimeout !== undefined) {
        window.clearTimeout(refreshExpiryTimeout);
        refreshExpiryTimeout = undefined;
    }
};

const expireSession = () => {
    stopTimers();
    // Stop protected requests immediately. Keycloak logout still receives the refresh token.
    setSessionTokens(null, getSessionRefreshToken());
    logout(true);
};

const startRefreshExpiryTimer = (remainingMs: number) => {
    if (!Number.isFinite(remainingMs)) {
        return;
    }

    const timeout = window.setTimeout(async () => {
        if (inflightTokenRefresh) {
            await inflightTokenRefresh;
        }
        if (refreshExpiryTimeout !== timeout) {
            return;
        }

        // A request or another Admin tab may have renewed the shared session.
        const remaining = getTokenExpiryFromLocalStorage().refreshTokenValidUntilTime - Date.now();
        if (remaining > 0) {
            startRefreshExpiryTimer(remaining);
        } else {
            expireSession();
        }
    }, Math.max(0, remainingMs));
    refreshExpiryTimeout = timeout;
};

const startTimers = () => {
    stopTimers();
    const expiry = getTokenExpiryFromLocalStorage();
    const now = Date.now();
    const accessRefreshDelay = expiry.accessTokenValidUntilTime - now - RENEW_BEFORE_EXPIRY_IN_MS;
    if (accessRefreshDelay > 0) {
        accessRefreshInterval = window.setInterval(() => {
            if (getTokenExpiryFromLocalStorage().refreshTokenValidUntilTime <= Date.now()) {
                if (!inflightTokenRefresh) {
                    expireSession();
                }
                return;
            }
            tryRefreshAccessToken();
        }, accessRefreshDelay);
    }
    startRefreshExpiryTimer(expiry.refreshTokenValidUntilTime - now);
};

export const bootstrapAuthSession = async (): Promise<boolean> => {
    if (hasSessionTokens()) {
        return true;
    }

    try {
        const session = await bootstrapAuthSessionViaBff();
        if (!session?.access_token || !session.refresh_token) {
            return false;
        }

        setSessionTokens(session.access_token, session.refresh_token);
        setTokenExpiryInLocalStorage(
            ACCESS_TOKEN_VALID_UNTIL_KEY,
            resolveExpiresInSeconds(session.access_token, session.expires_in),
        );
        setTokenExpiryInLocalStorage(
            REFRESH_TOKEN_VALID_UNTIL_KEY,
            resolveExpiresInSeconds(session.refresh_token, session.refresh_expires_in),
        );
        return true;
    } catch {
        return false;
    }
};

export const handleTokenRefresh = async (): Promise<void> => {
    try {
        if (!(await bootstrapAuthSession())) {
            logout(true);
            return;
        }
        if (inflightTokenRefresh) {
            await inflightTokenRefresh;
        }

        const expiry = getTokenExpiryFromLocalStorage();
        const now = Date.now();
        if (expiry.refreshTokenValidUntilTime <= now) {
            expireSession();
            return;
        }
        if (expiry.accessTokenValidUntilTime <= now && !(await tryRefreshAccessToken())) {
            logout(true);
            return;
        }

        startTimers();
    } catch {
        logout(true);
    }
};

export const getAccessTokenForRequests = (): string => getSessionAccessToken();

export const getRefreshTokenForRequests = (): string => getSessionRefreshToken();
