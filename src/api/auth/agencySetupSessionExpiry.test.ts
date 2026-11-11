// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';

const mocks = vi.hoisted(() => ({
    refresh: vi.fn(),
    apiLogout: vi.fn(),
    invalidate: vi.fn(),
    expiry: { accessTokenValidUntilTime: 0, refreshTokenValidUntilTime: 0 },
    tokens: { access: 'access-token', refresh: 'refresh-token' },
}));
vi.mock('./authBffClient', () => ({
    bootstrapAuthSessionViaBff: vi.fn(),
    refreshAuthTokensViaBff: mocks.refresh,
    setAuthTokensViaBff: vi.fn(),
}));
vi.mock('./tokenSessionStore', () => ({
    hasSessionTokens: () => Boolean(mocks.tokens.access && mocks.tokens.refresh),
    getSessionAccessToken: () => mocks.tokens.access,
    getSessionRefreshToken: () => mocks.tokens.refresh,
    setSessionTokens: (access: string | null, refresh: string | null) => {
        mocks.tokens = { access: access || '', refresh: refresh || '' };
    },
}));
vi.mock('./accessSessionLocalStorage', () => ({
    ACCESS_TOKEN_VALID_UNTIL_KEY: 'access-expiry',
    REFRESH_TOKEN_VALID_UNTIL_KEY: 'refresh-expiry',
    getTokenExpiryFromLocalStorage: () => mocks.expiry,
    setTokenExpiryInLocalStorage: (key: 'access-expiry' | 'refresh-expiry', expiresIn = 0) => {
        const expiry = Date.now() + expiresIn * 1000;
        if (key === 'access-expiry') {
            mocks.expiry.accessTokenValidUntilTime = expiry;
        } else {
            mocks.expiry.refreshTokenValidUntilTime = expiry;
        }
    },
    removeTokenExpiryFromLocalStorage: vi.fn(),
}));
vi.mock('./apiLogoutKeycloak', () => ({ default: mocks.apiLogout }));
vi.mock('./invalidateAuthSession', () => ({ invalidateAuthSession: mocks.invalidate }));
vi.mock('./accessSessionCookie', () => ({ removeAllCookies: vi.fn() }));
vi.mock('./clearAdminWebStorage', () => ({ clearAdminLocalStorage: vi.fn() }));
vi.mock('../../appConfig', () => ({
    default: { login: '/admin/login', agency: '/admin/agency' },
    CSRF_WHITELIST_HEADER: '',
}));
vi.mock('../../utils/generateCsrfToken', () => ({ default: () => 'csrf' }));
vi.mock('i18next', () => ({ default: { language: 'de', t: (key: string) => key } }));

const accessTokenExpiringAt = (validUntilMs: number): string =>
    `header.${btoa(JSON.stringify({ exp: Math.floor(validUntilMs / 1000) }))}.signature`;

// These tests run the real expiry timer, 401 retry and logout cleanup together.
// Only the BFF transport and session effects are replaced.
describe('mounted centre setup session expiry', () => {
    let location: { pathname: string; href: string };

    beforeEach(() => {
        vi.resetModules();
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-10-08T12:00:00Z'));
        mocks.refresh.mockReset().mockRejectedValue(new Error('session expired'));
        mocks.apiLogout.mockReset().mockResolvedValue(undefined);
        mocks.invalidate.mockReset().mockResolvedValue(undefined);
        mocks.tokens = { access: 'access-token', refresh: 'refresh-token' };
        mocks.expiry = {
            accessTokenValidUntilTime: Date.now() + 60_000,
            refreshTokenValidUntilTime: Date.now() + 120_000,
        };
        location = { pathname: '/admin/agency/5/setup', href: '/admin/agency/5/setup' };
        vi.stubGlobal('window', { location, setInterval, clearInterval, setTimeout, clearTimeout });
        vi.stubGlobal('sessionStorage', { clear: vi.fn() });
    });

    afterEach(() => {
        vi.clearAllTimers();
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    it('returns to the same setup after the refresh-token expiry timer fires on an already mounted route', async () => {
        // The near-expiry renewal fails; the refresh deadline still controls logout.
        mocks.expiry.accessTokenValidUntilTime = Date.now() + 5_000;
        mocks.expiry.refreshTokenValidUntilTime = Date.now() + 10_000;
        const { handleTokenRefresh } = await import('./auth');
        await handleTokenRefresh();
        await vi.advanceTimersByTimeAsync(10_099);
        expect(location.href).toBe('/admin/agency/5/setup');
        await vi.advanceTimersByTimeAsync(1);
        expect(location.href).toBe('/admin/login?agencySetupId=5');
        expect(mocks.apiLogout).toHaveBeenCalledTimes(1);
        expect(mocks.invalidate).toHaveBeenCalledTimes(1);
    });

    it('requires a new login after refresh expiry even when the mounted tab still has a valid access token', async () => {
        const minute = 60_000;
        const refreshLifetime = 30 * minute;
        mocks.expiry.accessTokenValidUntilTime = Date.now() + 5 * 60 * minute;
        mocks.expiry.refreshTokenValidUntilTime = Date.now() + refreshLifetime;
        const { handleTokenRefresh } = await import('./auth');
        await handleTokenRefresh();

        await vi.advanceTimersByTimeAsync(refreshLifetime - 1);
        expect(location.href).toBe('/admin/agency/5/setup');
        expect(mocks.invalidate).not.toHaveBeenCalled();

        await vi.advanceTimersByTimeAsync(101);
        expect(mocks.expiry.accessTokenValidUntilTime).toBeGreaterThan(Date.now());
        expect(location.href).toBe('/admin/login?agencySetupId=5');
        expect(mocks.refresh).not.toHaveBeenCalled();
        expect(mocks.invalidate).toHaveBeenCalledTimes(1);
    });

    it('uses the renewed shared refresh deadline instead of logging out at the original one', async () => {
        mocks.expiry.accessTokenValidUntilTime = Date.now() + 60_000;
        mocks.expiry.refreshTokenValidUntilTime = Date.now() + 20_000;
        const { handleTokenRefresh } = await import('./auth');
        await handleTokenRefresh();

        await vi.advanceTimersByTimeAsync(10_000);
        mocks.expiry.refreshTokenValidUntilTime = Date.now() + 20_000;
        await vi.advanceTimersByTimeAsync(10_100);
        expect(location.href).toBe('/admin/agency/5/setup');
        expect(mocks.invalidate).not.toHaveBeenCalled();

        await vi.advanceTimersByTimeAsync(10_000);
        expect(location.href).toBe('/admin/login?agencySetupId=5');
        expect(mocks.invalidate).toHaveBeenCalledTimes(1);
    });

    it('lets an in-flight refresh finish before deciding whether the mounted session expired', async () => {
        mocks.expiry.refreshTokenValidUntilTime = Date.now() + 20_000;
        let finishRefresh!: () => void;
        mocks.refresh.mockImplementation(
            () =>
                new Promise((resolve) => {
                    finishRefresh = () =>
                        resolve({
                            access_token: 'renewed-access',
                            expires_in: 60,
                            refresh_token: 'renewed-refresh',
                            refresh_expires_in: 20,
                        });
                }),
        );
        const { getAccessTokenForRequests, handleTokenRefresh, tryRefreshAccessToken } = await import('./auth');
        await handleTokenRefresh();

        await vi.advanceTimersByTimeAsync(19_000);
        const refresh = tryRefreshAccessToken();
        await vi.advanceTimersByTimeAsync(1_000);
        expect(mocks.apiLogout).not.toHaveBeenCalled();

        finishRefresh();
        await expect(refresh).resolves.toBe(true);
        expect(getAccessTokenForRequests()).toBe('renewed-access');
        await vi.advanceTimersByTimeAsync(19_999);
        expect(location.href).toBe('/admin/agency/5/setup');

        await vi.advanceTimersByTimeAsync(101);
        expect(location.href).toBe('/admin/login?agencySetupId=5');
        expect(mocks.refresh).toHaveBeenCalledTimes(1);
    });

    it('stops using the access token at refresh expiry while logout cleanup is still pending', async () => {
        mocks.expiry.refreshTokenValidUntilTime = Date.now() + 20_000;
        let finishLogout!: () => void;
        mocks.apiLogout.mockImplementation(
            () =>
                new Promise<void>((resolve) => {
                    finishLogout = resolve;
                }),
        );
        const { getAccessTokenForRequests, handleTokenRefresh } = await import('./auth');
        await handleTokenRefresh();

        await vi.advanceTimersByTimeAsync(20_000);
        expect(getAccessTokenForRequests()).toBe('');
        expect(mocks.apiLogout).toHaveBeenCalledTimes(1);
        expect(mocks.invalidate).not.toHaveBeenCalled();

        finishLogout();
        await vi.advanceTimersByTimeAsync(100);
        expect(location.href).toBe('/admin/login?agencySetupId=5');
    });

    it('retains the setup when the renewal timer finds the refresh token expired', async () => {
        const { handleTokenRefresh } = await import('./auth');
        await handleTokenRefresh();
        mocks.expiry.refreshTokenValidUntilTime = Date.now() - 20_000;
        await vi.advanceTimersByTimeAsync(50_100);
        expect(location.href).toBe('/admin/login?agencySetupId=5');
        expect(mocks.refresh).not.toHaveBeenCalled();
        expect(mocks.invalidate).toHaveBeenCalledTimes(1);
    });

    it('arms renewal for a near-expiry access token in this tab despite later shared access metadata', async () => {
        mocks.tokens.access = accessTokenExpiringAt(Date.now() + 5_000);
        const { handleTokenRefresh } = await import('./auth');
        await handleTokenRefresh();

        await vi.advanceTimersByTimeAsync(1);
        expect(mocks.refresh).toHaveBeenCalledTimes(1);
        await vi.advanceTimersByTimeAsync(20_000);
        expect(mocks.refresh).toHaveBeenCalledTimes(1);
        expect(location.href).toBe('/admin/agency/5/setup');
    });

    it('schedules the next renewal from the new token instead of repeating the first short delay', async () => {
        const now = Date.now();
        mocks.expiry.accessTokenValidUntilTime = now + 11_000;
        mocks.tokens.access = accessTokenExpiringAt(mocks.expiry.accessTokenValidUntilTime);
        mocks.refresh.mockResolvedValue({
            access_token: accessTokenExpiringAt(now + 121_000),
            expires_in: 120,
            refresh_token: 'renewed-refresh',
            refresh_expires_in: 300,
        });
        const { handleTokenRefresh } = await import('./auth');
        await handleTokenRefresh();

        await vi.advanceTimersByTimeAsync(1_000);
        expect(mocks.refresh).toHaveBeenCalledTimes(1);
        await vi.advanceTimersByTimeAsync(109_999);
        expect(mocks.refresh).toHaveBeenCalledTimes(1);
        await vi.advanceTimersByTimeAsync(1);
        expect(mocks.refresh).toHaveBeenCalledTimes(2);
        await vi.advanceTimersByTimeAsync(20_000);
        expect(mocks.refresh).toHaveBeenCalledTimes(2);
    });

    it('uses bounded browser delays for long token lifetimes and rechecks the actual deadlines', async () => {
        const browserDelayLimit = 2 ** 31 - 1;
        mocks.expiry.accessTokenValidUntilTime = Date.now() + browserDelayLimit + 100_000;
        mocks.expiry.refreshTokenValidUntilTime = Date.now() + browserDelayLimit + 200_000;
        const timeout = vi.spyOn(window, 'setTimeout');
        const { handleTokenRefresh } = await import('./auth');
        await handleTokenRefresh();

        expect(timeout.mock.calls.map(([, delay]) => delay)).toEqual([browserDelayLimit, browserDelayLimit]);
        await vi.advanceTimersByTimeAsync(browserDelayLimit);
        expect(mocks.refresh).not.toHaveBeenCalled();
        expect(mocks.invalidate).not.toHaveBeenCalled();

        await vi.advanceTimersByTimeAsync(90_000);
        expect(mocks.refresh).toHaveBeenCalledTimes(1);
        await vi.advanceTimersByTimeAsync(109_999);
        expect(location.href).toBe('/admin/agency/5/setup');
        expect(mocks.refresh).toHaveBeenCalledTimes(1);

        await vi.advanceTimersByTimeAsync(101);
        expect(location.href).toBe('/admin/login?agencySetupId=5');
    });

    it.each([false, true])(
        'retains setup on a 401 with successful refresh=%s followed by no usable session',
        async (refreshSucceeds) => {
            if (refreshSucceeds) {
                mocks.refresh.mockResolvedValue({ access_token: 'fresh', refresh_token: 'refresh' });
            }
            const fetchMock = vi.fn().mockResolvedValue({ status: 401 });
            vi.stubGlobal('fetch', fetchMock);
            const { fetchData, FETCH_ERRORS } = await import('../fetchData');
            await expect(
                fetchData({
                    url: 'https://api.test/service/agencyadmin/agencies/5',
                    method: 'PUT',
                    bodyData: JSON.stringify({ telephone: '123' }),
                    responseHandling: [FETCH_ERRORS.CATCH_ALL_SILENT],
                }),
            ).rejects.toThrow(FETCH_ERRORS.UNAUTHORIZED);
            await vi.advanceTimersByTimeAsync(100);
            expect(location.href).toBe('/admin/login?agencySetupId=5');
            expect(fetchMock).toHaveBeenCalledTimes(refreshSucceeds ? 2 : 1);
            expect(mocks.refresh).toHaveBeenCalledTimes(1);
            expect(mocks.invalidate).toHaveBeenCalledTimes(1);
        },
    );

    it('captures the setup destination before asynchronous logout cleanup and route changes', async () => {
        let completeLogout: (() => void) | undefined;
        mocks.apiLogout.mockImplementation(
            () =>
                new Promise<void>((resolve) => {
                    completeLogout = resolve;
                }),
        );
        const { default: logout } = await import('./logout');
        logout(true);
        location.pathname = '/admin/login';
        completeLogout?.();
        await vi.advanceTimersByTimeAsync(100);
        expect(location.href).toBe('/admin/login?agencySetupId=5');
    });

    it.each([
        '/admin/agency/5/general',
        '/admin/agency/add/setup',
        '/admin/agency/0/setup',
        '/admin/agency/05/setup',
        '/admin/agency/9007199254740992/setup',
    ])('keeps ordinary login for %s', async (pathname) => {
        location.pathname = pathname;
        const { default: logout } = await import('./logout');
        logout(true);
        await vi.advanceTimersByTimeAsync(100);
        expect(location.href).toBe('/admin/login');
    });

    it.each(['/admin/access-denied', '/admin/login', '/admin/login?agencySetupId=8'])(
        'keeps explicit destination %s unchanged',
        async (destination) => {
            const { default: logout } = await import('./logout');
            logout(true, destination);
            await vi.advanceTimersByTimeAsync(100);
            expect(location.href).toBe(destination);
        },
    );

    it('cleans the expired session without navigating when redirect is disabled', async () => {
        const { default: logout } = await import('./logout');
        logout(false);
        await vi.advanceTimersByTimeAsync(100);
        expect(location.href).toBe('/admin/agency/5/setup');
        expect(mocks.invalidate).toHaveBeenCalledTimes(1);
    });
});
