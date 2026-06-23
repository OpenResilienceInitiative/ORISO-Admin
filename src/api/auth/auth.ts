import logout from './logout';
import {
    bootstrapAuthSessionViaBff,
    refreshAuthTokensViaBff,
    setAuthTokensViaBff,
} from './authBffClient';
import { getTokenExpiryFromLocalStorage, setTokenExpiryInLocalStorage } from './accessSessionLocalStorage';
import routePathNames from '../../appConfig';
import {
    getSessionAccessToken,
    getSessionRefreshToken,
    hasSessionTokens,
    setSessionTokens,
} from './tokenSessionStore';

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
        if (typeof payload.exp === 'number') {
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
        setTokenExpiryInLocalStorage('auth.access_token_valid_until', expires_in);
    }
    if (refresh_token) {
        setTokenExpiryInLocalStorage('auth.refresh_token_valid_until', refresh_expires_in);
    }

    await setAuthTokensViaBff({
        access_token,
        refresh_token,
        expires_in,
        refresh_expires_in,
    });
};

const refreshTokens = (): Promise<void> => {
    const currentTime = new Date().getTime();
    const tokenExpiry = getTokenExpiryFromLocalStorage();

    if (tokenExpiry.refreshTokenValidUntilTime <= currentTime - RENEW_BEFORE_EXPIRY_IN_MS) {
        return Promise.resolve();
    }

    return refreshAuthTokensViaBff().then((response) =>
        setTokens(response.access_token, response.expires_in, response.refresh_token, response.refresh_expires_in),
    );
};

const startTimers = ({
    accessTokenValidInMs,
    refreshTokenValidInMs,
}: {
    accessTokenValidInMs: number;
    refreshTokenValidInMs: number;
}) => {
    const accessTokenRefreshIntervalInMs = accessTokenValidInMs - RENEW_BEFORE_EXPIRY_IN_MS;

    let refreshInterval: number | undefined;
    if (accessTokenRefreshIntervalInMs > 0) {
        refreshInterval = window.setInterval(() => {
            refreshTokens();
        }, accessTokenRefreshIntervalInMs);
    }

    if (refreshTokenValidInMs > accessTokenValidInMs) {
        window.setTimeout(() => {
            if (refreshInterval) {
                window.clearInterval(refreshInterval);
            }

            logout(true, routePathNames.login);
        }, refreshTokenValidInMs);
    }
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
            'auth.access_token_valid_until',
            resolveExpiresInSeconds(session.access_token, session.expires_in),
        );
        setTokenExpiryInLocalStorage(
            'auth.refresh_token_valid_until',
            resolveExpiresInSeconds(session.refresh_token, session.refresh_expires_in),
        );
        return true;
    } catch {
        return false;
    }
};

export const handleTokenRefresh = (): Promise<void> => {
    return new Promise((resolve) => {
        bootstrapAuthSession()
            .then((hasSession) => {
                if (!hasSession) {
                    logout(true, routePathNames.login);
                    resolve();
                    return;
                }

                const currentTime = new Date().getTime();
                const tokenExpiry = getTokenExpiryFromLocalStorage();
                const accessTokenValidInMs = tokenExpiry.accessTokenValidUntilTime - currentTime;
                const refreshTokenValidInMs = tokenExpiry.refreshTokenValidUntilTime - currentTime;

                if (refreshTokenValidInMs <= 0 && accessTokenValidInMs <= 0) {
                    logout(true, routePathNames.login);
                    resolve();
                } else if (accessTokenValidInMs <= 0) {
                    refreshTokens().then(() => {
                        startTimers({
                            accessTokenValidInMs,
                            refreshTokenValidInMs,
                        });
                        resolve();
                    });
                } else {
                    startTimers({
                        accessTokenValidInMs,
                        refreshTokenValidInMs,
                    });
                    resolve();
                }
            })
            .catch(() => {
                logout(true, routePathNames.login);
                resolve();
            });
    });
};

export const getAccessTokenForRequests = (): string => getSessionAccessToken();

export const getRefreshTokenForRequests = (): string => getSessionRefreshToken();
