// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';

const mocks = vi.hoisted(() => ({
    keycloakLogout: vi.fn(),
    clearCookies: vi.fn(),
    bootstrap: vi.fn(),
    refresh: vi.fn(),
    setCookies: vi.fn(),
}));
vi.mock('./apiLogoutKeycloak', () => ({ default: mocks.keycloakLogout }));
vi.mock('./authBffClient', () => ({
    clearAuthTokensViaBff: mocks.clearCookies,
    bootstrapAuthSessionViaBff: mocks.bootstrap,
    refreshAuthTokensViaBff: mocks.refresh,
    setAuthTokensViaBff: mocks.setCookies,
}));
vi.mock('./accessSessionCookie', () => ({ removeAllCookies: vi.fn() }));
vi.mock('../../appConfig', () => ({
    default: { login: '/admin/login', agency: '/admin/agency' },
}));

const issuer = 'https://identity.example.test/realms/synthetic';
const logoutKey = 'oriso-admin.auth.explicit-logout';
const oldSessionKey = JSON.stringify([issuer, 'first-session']);
const newerSessionKey = JSON.stringify([issuer, 'second-session']);

const storageFor = (values: Map<string, string>) => ({
    get length() {
        return values.size;
    },
    key: (index: number) => Array.from(values.keys())[index] ?? null,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
    clear: () => values.clear(),
});

const sessionToken = (sid: string, rotation = 0) => {
    const claims = Buffer.from(JSON.stringify({ iss: issuer, sid, rotation })).toString('base64url');
    return `header.${claims}.signature`;
};

describe('explicit Admin tab logout', () => {
    let storage: Map<string, string>;
    let tabStorage: Map<string, string>;
    let storageListener: (event: Pick<StorageEvent, 'key' | 'newValue' | 'storageArea'>) => void;
    const replaceLocation = vi.fn();
    const notifyLogout = () =>
        storageListener({ key: logoutKey, newValue: oldSessionKey, storageArea: window.localStorage });

    beforeEach(() => {
        vi.resetModules();
        vi.useFakeTimers();
        mocks.keycloakLogout.mockReset().mockResolvedValue(undefined);
        mocks.clearCookies.mockReset().mockResolvedValue(undefined);
        mocks.bootstrap.mockReset();
        mocks.refresh.mockReset();
        mocks.setCookies.mockReset();
        replaceLocation.mockClear();
        storage = new Map();
        tabStorage = new Map();
        const local = storageFor(storage);
        vi.stubGlobal('localStorage', local);
        vi.stubGlobal('sessionStorage', storageFor(tabStorage));
        vi.stubGlobal('window', {
            location: { pathname: '/admin/agency/5/setup', href: '/admin/agency/5/setup', replace: replaceLocation },
            localStorage: local,
            addEventListener: (_: string, listener: typeof storageListener) => {
                storageListener = listener;
            },
            removeEventListener: vi.fn(),
        });
    });

    afterEach(() => {
        vi.clearAllTimers();
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    it('announces the explicit logout to peer tabs after the browser session is cleared', async () => {
        const { default: logout } = await import('./logout');
        const { setSessionTokens } = await import('./tokenSessionStore');
        const token = sessionToken('first-session');
        setSessionTokens(token, token);

        let finishClear!: () => void;
        mocks.clearCookies.mockImplementation(
            () =>
                new Promise<void>((resolve) => {
                    finishClear = resolve;
                }),
        );
        logout(true, '/admin/login', 'explicit');
        await vi.advanceTimersByTimeAsync(0);

        expect(mocks.clearCookies).toHaveBeenCalledTimes(1);
        expect(storage.has(logoutKey)).toBe(false);
        finishClear();
        await vi.advanceTimersByTimeAsync(100);

        expect(storage.get(logoutKey)).toBe(oldSessionKey);
        expect(tabStorage.get(logoutKey)).toBe(oldSessionKey);
        expect(window.location.href).toBe('/admin/login');
    });

    it('leaves an automatic logout local to its initiating tab', async () => {
        const { default: logout } = await import('./logout');
        const { setSessionTokens } = await import('./tokenSessionStore');
        const token = sessionToken('first-session');
        setSessionTokens(token, token);

        logout(true);
        await vi.advanceTimersByTimeAsync(100);

        expect(mocks.clearCookies).toHaveBeenCalledTimes(1);
        expect(storage.has(logoutKey)).toBe(false);
    });

    it('drops the matching rotated session before navigation and never sends a peer logout', async () => {
        const { default: logout, installAdminTabLogoutListener } = await import('./logout');
        const { getSessionAccessToken, hasSessionTokens, setSessionTokens } = await import('./tokenSessionStore');
        const token = sessionToken('first-session', 1);
        setSessionTokens(token, token);
        installAdminTabLogoutListener();
        tabStorage.set('oriso-admin.legal.privacy.hint.closed', 'true');
        tabStorage.set('oriso-admin:chunk-reloaded', '1');
        tabStorage.set('registrationData', 'app-only');

        storage.set(logoutKey, oldSessionKey);
        expect(getSessionAccessToken()).toBe('');
        notifyLogout();
        notifyLogout();
        logout(true);
        await vi.advanceTimersByTimeAsync(100);

        expect(hasSessionTokens()).toBe(false);
        expect(replaceLocation).toHaveBeenCalledExactlyOnceWith('/admin/login?agencySetupId=5');
        expect(mocks.keycloakLogout).not.toHaveBeenCalled();
        expect(mocks.clearCookies).not.toHaveBeenCalled();
        expect(storage.get(logoutKey)).toBe(oldSessionKey);
        expect(tabStorage).toEqual(
            new Map([
                ['registrationData', 'app-only'],
                [logoutKey, oldSessionKey],
            ]),
        );
    });

    it('applies a queued matching signal after the shared marker changes', async () => {
        const { installAdminTabLogoutListener } = await import('./logout');
        const { getSessionRefreshToken, setSessionTokens } = await import('./tokenSessionStore');
        const token = sessionToken('first-session');
        setSessionTokens(token, token);
        installAdminTabLogoutListener();

        storage.set(logoutKey, oldSessionKey);
        expect(getSessionRefreshToken()).toBe('');
        // The independent refresh-expiry timer can run before a queued storage event.
        expect(setSessionTokens(null, getSessionRefreshToken())).toBe(false);
        storage.set(logoutKey, newerSessionKey);
        expect(getSessionRefreshToken()).toBe('');
        notifyLogout();

        expect(replaceLocation).toHaveBeenCalledExactlyOnceWith('/admin/login?agencySetupId=5');
        expect(storage.get(logoutKey)).toBe(newerSessionKey);
        expect(tabStorage.get(logoutKey)).toBe(oldSessionKey);
        expect(setSessionTokens(token, token)).toBe(false);
        expect(mocks.clearCookies).not.toHaveBeenCalled();
    });

    it('keeps a newer session and its expiry when an old signal arrives', async () => {
        const { installAdminTabLogoutListener } = await import('./logout');
        const { getSessionAccessToken, setSessionTokens } = await import('./tokenSessionStore');
        const current = sessionToken('second-session');
        setSessionTokens(current, current);
        installAdminTabLogoutListener();

        storage.set(logoutKey, oldSessionKey);
        storage.set('oriso-admin.auth.access_token_valid_until', 'fresh-expiry');
        notifyLogout();

        expect(getSessionAccessToken()).toBe(current);
        expect(storage.get('oriso-admin.auth.access_token_valid_until')).toBe('fresh-expiry');
        expect(replaceLocation).not.toHaveBeenCalled();
        expect(mocks.clearCookies).not.toHaveBeenCalled();
    });

    it.each(['bootstrap', 'refresh'] as const)('rejects a late %s for the logged-out session', async (operation) => {
        const { bootstrapAuthSession, setTokens, tryRefreshAccessToken } = await import('./auth');
        const { getSessionAccessToken } = await import('./tokenSessionStore');
        const { default: logout } = await import('./logout');
        let finishResponse!: (value: object) => void;
        mocks[operation].mockImplementation(
            () =>
                new Promise<object>((resolve) => {
                    finishResponse = resolve;
                }),
        );

        const pending = operation === 'bootstrap' ? bootstrapAuthSession() : tryRefreshAccessToken();
        storage.set(logoutKey, oldSessionKey);
        const oldToken = sessionToken('first-session');
        finishResponse({ access_token: oldToken, refresh_token: oldToken });
        expect(await pending).toBe(false);
        await setTokens(oldToken, 60, oldToken, 120);

        expect(getSessionAccessToken()).toBe('');
        expect(storage.size).toBe(1);
        expect(mocks.setCookies).not.toHaveBeenCalled();
        logout(true);
        expect(replaceLocation).toHaveBeenCalledExactlyOnceWith('/admin/login?agencySetupId=5');
        expect(mocks.clearCookies).not.toHaveBeenCalled();
    });
});
