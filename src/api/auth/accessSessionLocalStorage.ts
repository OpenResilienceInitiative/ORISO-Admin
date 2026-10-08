// The counselling app on the same host keeps its own expiry under `auth.*`; these keys are the
// Admin's alone, so logging in or out here never touches the app's session timers.
export const ACCESS_TOKEN_VALID_UNTIL_KEY = 'oriso-admin.auth.access_token_valid_until';
export const REFRESH_TOKEN_VALID_UNTIL_KEY = 'oriso-admin.auth.refresh_token_valid_until';

export type LocalStorageKey = typeof ACCESS_TOKEN_VALID_UNTIL_KEY | typeof REFRESH_TOKEN_VALID_UNTIL_KEY;

export const getLocalStorageItem = (key: LocalStorageKey): string => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return localStorage.getItem(key);
};

export const removeLocalStorageItem = (key: LocalStorageKey): void => {
    localStorage.removeItem(key);
};

export const setTokenExpiryInLocalStorage = (key: LocalStorageKey, expiresInMs = 0) => {
    const validUntilTime = new Date().getTime() + expiresInMs * 1000;
    localStorage.setItem(key, validUntilTime.toString());
};

export const getTokenExpiryFromLocalStorage = () => ({
    accessTokenValidUntilTime: parseInt(getLocalStorageItem(ACCESS_TOKEN_VALID_UNTIL_KEY), 10),
    refreshTokenValidUntilTime: parseInt(getLocalStorageItem(REFRESH_TOKEN_VALID_UNTIL_KEY), 10),
});

export const removeTokenExpiryFromLocalStorage = () => {
    removeLocalStorageItem(ACCESS_TOKEN_VALID_UNTIL_KEY);
    removeLocalStorageItem(REFRESH_TOKEN_VALID_UNTIL_KEY);
};
