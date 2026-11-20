import { forgetAdminSession, isAdminSessionLoggedOut, trackAdminSession } from './adminTabLogoutSignal';

let accessToken: string | null = null;
let refreshToken: string | null = null;

export const setSessionTokens = (
    nextAccessToken: string | null | undefined,
    nextRefreshToken: string | null | undefined,
): boolean => {
    if (!trackAdminSession(nextAccessToken, nextRefreshToken)) return false;
    accessToken = nextAccessToken || null;
    refreshToken = nextRefreshToken || null;
    return true;
};

export const getSessionAccessToken = (): string => (isAdminSessionLoggedOut() ? '' : accessToken || '');

export const getSessionRefreshToken = (): string => (isAdminSessionLoggedOut() ? '' : refreshToken || '');

export const hasSessionTokens = (): boolean => Boolean(accessToken && refreshToken) && !isAdminSessionLoggedOut();

export const clearSessionTokens = (): void => {
    forgetAdminSession();
    accessToken = null;
    refreshToken = null;
};
