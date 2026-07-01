// @vitest-environment node
// Node env: fetch/Request/AbortController all come from the same realm, avoiding
// the jsdom-vs-undici "signal is not an AbortSignal" mismatch. No DOM is needed here.
import { describe, it, expect, vi, beforeEach } from 'vitest';

// fetchData statically pulls in antd / i18next / appConfig / auth side effects.
// Stub them so the unit stays focused on the self-healing 401 retry flow and we
// can drive tryRefreshAccessToken / logout deterministically.
const tryRefreshAccessToken = vi.fn();
const getAccessTokenForRequests = vi.fn(() => 'access-token');
const appConfigMock = vi.hoisted(() => ({
    csrfWhitelistHeader: 'X-CSRF-Token',
}));
vi.mock('./auth/auth', () => ({
    getAccessTokenForRequests: () => getAccessTokenForRequests(),
    tryRefreshAccessToken: () => tryRefreshAccessToken(),
}));

const logout = vi.fn();
vi.mock('./auth/logout', () => ({ default: (...args: unknown[]) => logout(...args) }));

vi.mock('./auth/accessSessionCookie', () => ({ getValueFromCookie: () => '' }));
vi.mock('../utils/generateCsrfToken', () => ({ default: () => 'csrf-token' }));
vi.mock('../utils/language', () => ({ DEFAULT_LANGUAGE: 'de', normalizeLanguage: (lang: string) => lang }));
vi.mock('../appConfig', () => ({
    default: { login: '/admin/login' },
    get CSRF_WHITELIST_HEADER() {
        return appConfigMock.csrfWhitelistHeader;
    },
}));
vi.mock('antd', () => ({ message: { error: vi.fn() } }));
vi.mock('i18next', () => ({ default: { resolvedLanguage: 'de', language: 'de', t: (key: unknown) => key } }));

// eslint-disable-next-line import/first
import { fetchData, FETCH_METHODS, FETCH_ERRORS } from './fetchData';

const response = (status: number, body: Record<string, unknown> = {}) => ({
    status,
    headers: { get: () => null },
    json: async () => body,
});

const createAgency = () =>
    fetchData({
        url: 'https://api.test/service/agencyadmin/agencies',
        method: FETCH_METHODS.POST,
        responseHandling: [FETCH_ERRORS.CATCH_ALL],
        bodyData: JSON.stringify({ name: 'Kontaktstelle Hafen' }),
    });

describe('fetchData – self-healing 401 retry (logout-on-create fix)', () => {
    beforeEach(() => {
        tryRefreshAccessToken.mockReset();
        logout.mockReset();
        getAccessTokenForRequests.mockReset();
        getAccessTokenForRequests.mockReturnValue('access-token');
        appConfigMock.csrfWhitelistHeader = 'X-CSRF-Token';
    });

    it('refreshes the token and retries once on 401, then succeeds without logging out', async () => {
        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce(response(401))
            .mockResolvedValueOnce(response(201, { ok: true }));
        vi.stubGlobal('fetch', fetchMock);
        tryRefreshAccessToken.mockResolvedValue(true);

        const result = await createAgency();

        expect(tryRefreshAccessToken).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(logout).not.toHaveBeenCalled();
        expect((result as { status: number }).status).toBe(201);
    });

    it('logs out (once) when there is no valid session to refresh', async () => {
        const fetchMock = vi.fn().mockResolvedValue(response(401));
        vi.stubGlobal('fetch', fetchMock);
        tryRefreshAccessToken.mockResolvedValue(false);

        await expect(createAgency()).rejects.toThrow(FETCH_ERRORS.UNAUTHORIZED);
        expect(tryRefreshAccessToken).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledTimes(1); // no retry when the refresh fails
        expect(logout).toHaveBeenCalledTimes(1);
    });

    it('does not loop: if the retry is still 401, it logs out exactly once', async () => {
        const fetchMock = vi.fn().mockResolvedValue(response(401));
        vi.stubGlobal('fetch', fetchMock);
        tryRefreshAccessToken.mockResolvedValue(true);

        await expect(createAgency()).rejects.toThrow(FETCH_ERRORS.UNAUTHORIZED);
        expect(fetchMock).toHaveBeenCalledTimes(2); // original + exactly one retry
        expect(tryRefreshAccessToken).toHaveBeenCalledTimes(1);
        expect(logout).toHaveBeenCalledTimes(1);
    });

    it('never refreshes or logs out for skipAuth (public) requests on 401', async () => {
        const fetchMock = vi.fn().mockResolvedValue(response(401));
        vi.stubGlobal('fetch', fetchMock);

        await expect(
            fetchData({
                url: 'https://api.test/service/topic/public',
                method: FETCH_METHODS.GET,
                skipAuth: true,
                responseHandling: [FETCH_ERRORS.CATCH_ALL],
            }),
        ).rejects.toBeTruthy();

        expect(tryRefreshAccessToken).not.toHaveBeenCalled();
        expect(logout).not.toHaveBeenCalled();
    });

    it('omits the local CSRF whitelist header when no header name is configured', async () => {
        appConfigMock.csrfWhitelistHeader = '';
        const fetchMock = vi.fn().mockImplementation((request: Request) => {
            expect(Array.from(request.headers.keys())).not.toContain('');
            expect(request.headers.get('x-csrf-token')).toBe('csrf-token');
            return Promise.resolve(response(204));
        });
        vi.stubGlobal('fetch', fetchMock);

        await fetchData({
            url: 'https://api.test/service/settings',
            method: FETCH_METHODS.GET,
            skipAuth: true,
        });

        expect(fetchMock).toHaveBeenCalledTimes(1);
    });
});
