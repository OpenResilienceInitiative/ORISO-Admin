import parseJwt from '../../utils/parseJWT';

export const ADMIN_TAB_LOGOUT_KEY = 'oriso-admin.auth.explicit-logout';

let tabSessionKey: string | null = null;
let loggedOutTabSessionKey: string | null = null;

const sessionKeyOf = (token: string | null | undefined): string | null => {
    const claims = token ? parseJwt(token) : null;
    const issuer = claims?.iss;
    const sessionId = claims?.sid;
    return typeof issuer === 'string' && issuer && typeof sessionId === 'string' && sessionId
        ? JSON.stringify([issuer, sessionId])
        : null;
};

const readLogoutMarker = (storage: 'localStorage' | 'sessionStorage'): string | null => {
    try {
        return globalThis[storage].getItem(ADMIN_TAB_LOGOUT_KEY);
    } catch {
        return null;
    }
};

const isLoggedOutSession = (key: string | null): boolean =>
    key !== null && (readLogoutMarker('localStorage') === key || readLogoutMarker('sessionStorage') === key);

export const getLoggedOutAdminSessionKey = () => {
    if (loggedOutTabSessionKey === null && isLoggedOutSession(tabSessionKey)) {
        loggedOutTabSessionKey = tabSessionKey;
    }
    return loggedOutTabSessionKey;
};

export const trackAdminSession = (accessToken: string | null | undefined, refreshToken: string | null | undefined) => {
    const key = sessionKeyOf(refreshToken) ?? sessionKeyOf(accessToken);
    // An expiry callback can clear both visible tokens before the storage event is delivered.
    // Keep the matching session identity until its local teardown can complete.
    if (key === null && getLoggedOutAdminSessionKey() !== null) return false;
    if (isLoggedOutSession(key)) {
        // A late response for an old session must not displace a newer session in this tab.
        if (tabSessionKey === null || tabSessionKey === key) loggedOutTabSessionKey = key;
        return false;
    }
    tabSessionKey = key;
    loggedOutTabSessionKey = null;
    return true;
};

export const forgetAdminSession = (): void => {
    tabSessionKey = null;
    loggedOutTabSessionKey = null;
};

export const getAdminSessionKey = () => tabSessionKey;

export const isAdminSessionLoggedOut = () => getLoggedOutAdminSessionKey() !== null;

export const rememberAdminTabLogout = (key: string): void => {
    try {
        // A queued signal remains valid even after another tab replaces the shared marker.
        sessionStorage.setItem(ADMIN_TAB_LOGOUT_KEY, key);
    } catch {
        // Browser storage may be unavailable.
    }
};

export const publishAdminTabLogout = (key: string): void => {
    rememberAdminTabLogout(key);
    try {
        // The marker also guards a new document against a late cookie/bootstrap response.
        localStorage.setItem(ADMIN_TAB_LOGOUT_KEY, key);
    } catch {
        // The initiating tab can still finish logging out when storage is unavailable.
    }
};
