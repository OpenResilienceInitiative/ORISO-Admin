// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    refresh: vi.fn(),
    apiLogout: vi.fn(),
    invalidate: vi.fn(),
    expiry: { accessTokenValidUntilTime: 0, refreshTokenValidUntilTime: 0 },
}));
vi.mock('./authBffClient', () => ({
    bootstrapAuthSessionViaBff: vi.fn(),
    refreshAuthTokensViaBff: mocks.refresh,
    setAuthTokensViaBff: vi.fn(),
}));
vi.mock('./tokenSessionStore', () => ({
    hasSessionTokens: () => true,
    getSessionAccessToken: () => 'access-token',
    getSessionRefreshToken: () => 'refresh-token',
    setSessionTokens: vi.fn(),
}));
vi.mock('./accessSessionLocalStorage', () => ({
    ACCESS_TOKEN_VALID_UNTIL_KEY: 'access-expiry',
    REFRESH_TOKEN_VALID_UNTIL_KEY: 'refresh-expiry',
    getTokenExpiryFromLocalStorage: () => mocks.expiry,
    setTokenExpiryInLocalStorage: vi.fn(),
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
vi.mock('antd', () => ({ message: { error: vi.fn() } }));
vi.mock('i18next', () => ({ default: { language: 'de', t: (key: string) => key } }));

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
        mocks.expiry = {
            accessTokenValidUntilTime: Date.now() + 60_000,
            refreshTokenValidUntilTime: Date.now() + 120_000,
        };
        location = { pathname: '/admin/agency/5/setup', href: '/admin/agency/5/setup' };
        vi.stubGlobal('window', { location, setInterval, clearInterval, setTimeout });
        vi.stubGlobal('sessionStorage', { clear: vi.fn() });
    });

    afterEach(() => {
        vi.clearAllTimers();
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    it('returns to the same setup after the refresh-token expiry timer fires on an already mounted route', async () => {
        // A lifetime below the renewal threshold isolates the refresh-expiry timeout.
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

    it('retains the setup when the renewal interval finds the refresh token expired', async () => {
        const { handleTokenRefresh } = await import('./auth');
        await handleTokenRefresh();
        mocks.expiry.refreshTokenValidUntilTime = Date.now() - 20_000;
        await vi.advanceTimersByTimeAsync(50_100);
        expect(location.href).toBe('/admin/login?agencySetupId=5');
        expect(mocks.refresh).not.toHaveBeenCalled();
        expect(mocks.invalidate).toHaveBeenCalledTimes(1);
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
