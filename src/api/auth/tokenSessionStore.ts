let accessToken: string | null = null;
let refreshToken: string | null = null;

export const setSessionTokens = (
    nextAccessToken: string | null | undefined,
    nextRefreshToken: string | null | undefined,
): void => {
    accessToken = nextAccessToken || null;
    refreshToken = nextRefreshToken || null;
};

export const getSessionAccessToken = (): string => accessToken || '';

export const getSessionRefreshToken = (): string => refreshToken || '';

export const hasSessionTokens = (): boolean => Boolean(accessToken && refreshToken);

export const clearSessionTokens = (): void => {
    accessToken = null;
    refreshToken = null;
};
