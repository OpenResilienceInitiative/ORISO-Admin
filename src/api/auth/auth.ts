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

const readJwtExpiry = (token: string | undefined): number | undefined => {
    const expiry = token ? parseJwt(token)?.exp : undefined;
    return typeof expiry === 'number' && Number.isFinite(expiry * 1000) ? expiry : undefined;
};

const resolveExpiresInSeconds = (token: string | undefined, expiresIn?: number): number | undefined => {
    if (expiresIn) {
        return expiresIn;
    }

    const expiry = readJwtExpiry(token);
    return expiry === undefined ? undefined : Math.max(expiry - Math.floor(Date.now() / 1000), 0);
};

export const RENEW_BEFORE_EXPIRY_IN_MS = 10 * 1000; // seconds
const MAX_BROWSER_TIMER_DELAY_MS = 2 ** 31 - 1;
const boundedTimerDelay = (delay: number) => Math.min(MAX_BROWSER_TIMER_DELAY_MS, Math.max(0, delay));

const getCurrentAccessExpiry = () => {
    // Another tab can update shared metadata without replacing this tab's access token.
    const expiry = readJwtExpiry(getSessionAccessToken());
    return expiry === undefined ? getTokenExpiryFromLocalStorage().accessTokenValidUntilTime : expiry * 1000;
};

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

let accessRefreshTimeout: number | undefined;
let refreshExpiryTimeout: number | undefined;

const stopTimers = () => {
    if (accessRefreshTimeout !== undefined) {
        window.clearTimeout(accessRefreshTimeout);
        accessRefreshTimeout = undefined;
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
    }, boundedTimerDelay(remainingMs));
    refreshExpiryTimeout = timeout;
};

const getAccessRefreshDelay = () => getCurrentAccessExpiry() - Date.now() - RENEW_BEFORE_EXPIRY_IN_MS;

const startAccessRefreshTimer = (afterRenewal = false) => {
    const delay = getAccessRefreshDelay();
    // Fall back to the request's 401 retry if even a freshly renewed token is nearly expired.
    if (!Number.isFinite(delay) || (afterRenewal && delay < RENEW_BEFORE_EXPIRY_IN_MS)) {
        return;
    }

    const timeout = window.setTimeout(async () => {
        if (accessRefreshTimeout !== timeout || !hasSessionTokens()) {
            return;
        }
        if (getAccessRefreshDelay() > 0) {
            startAccessRefreshTimer();
            return;
        }
        if (!inflightTokenRefresh && getTokenExpiryFromLocalStorage().refreshTokenValidUntilTime <= Date.now()) {
            expireSession();
            return;
        }

        const renewed = await tryRefreshAccessToken();
        if (renewed && accessRefreshTimeout === timeout) {
            startAccessRefreshTimer(true);
        }
    }, boundedTimerDelay(delay));
    accessRefreshTimeout = timeout;
};

const startTimers = (afterRenewal = false) => {
    stopTimers();
    startAccessRefreshTimer(afterRenewal);
    startRefreshExpiryTimer(getTokenExpiryFromLocalStorage().refreshTokenValidUntilTime - Date.now());
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
        const accessExpired = getCurrentAccessExpiry() <= now;
        if (accessExpired && !(await tryRefreshAccessToken())) {
            logout(true);
            return;
        }

        startTimers(accessExpired);
    } catch {
        logout(true);
    }
};

export const getAccessTokenForRequests = (): string => getSessionAccessToken();

export const getRefreshTokenForRequests = (): string => getSessionRefreshToken();
