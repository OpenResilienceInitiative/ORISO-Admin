// @vitest-environment node
// Node env: fetch/Request/AbortController all come from the same realm, avoiding
// the jsdom-vs-undici "signal is not an AbortSignal" mismatch. No DOM is needed here.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

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
const messageError = vi.hoisted(() => vi.fn());
vi.mock('antd', () => ({ message: { error: messageError } }));
vi.mock('i18next', () => ({ default: { resolvedLanguage: 'de', language: 'de', t: (key: unknown) => key } }));

// eslint-disable-next-line import/first
import { fetchData, FETCH_METHODS, FETCH_ERRORS, FETCH_SUCCESS } from './fetchData';

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
        messageError.mockReset();
    });

    // Guarantee cleanup even if an assertion throws mid-test, so fake timers and
    // the stubbed fetch never leak into the next test.
    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
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
            expect(Object.fromEntries(request.headers.entries())).toEqual({
                'accept-language': 'de',
                'cache-control': 'no-cache',
                'content-type': 'application/json',
                'x-csrf-token': 'csrf-token',
            });
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

    it('preserves FormData bodies without forcing a JSON content type', async () => {
        const body = new FormData();
        body.append('file', new Blob(['image'], { type: 'image/png' }), 'image.png');
        const fetchMock = vi.fn().mockImplementation((request: Request) => {
            expect(request.body).not.toBeNull();
            expect(request.headers.get('content-type')).toMatch(/^multipart\/form-data; boundary=/);
            return Promise.resolve(response(201, { id: 'media-id' }));
        });
        vi.stubGlobal('fetch', fetchMock);

        const result = await fetchData({
            url: 'https://api.test/service/tenantadmin/media',
            method: FETCH_METHODS.POST,
            bodyData: body,
            responseHandling: [FETCH_ERRORS.CATCH_ALL_SILENT, FETCH_SUCCESS.CONTENT],
        });

        expect(result).toEqual({ id: 'media-id' });
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('rejects on 403 so callers can leave loading states', async () => {
        const location = { href: '' };
        vi.stubGlobal('window', { location });
        const fetchMock = vi.fn().mockResolvedValue(response(403));
        vi.stubGlobal('fetch', fetchMock);

        await expect(
            fetchData({
                url: 'https://api.test/service/agencyadmin/agencies?q=*',
                method: FETCH_METHODS.GET,
                responseHandling: [],
            }),
        ).rejects.toThrow(FETCH_ERRORS.NOT_ALLOWED);

        expect(location.href).toBe('/admin/access-denied');
    });

    it('skips the access-denied redirect on 403 when the caller opts into FORBIDDEN_SILENT', async () => {
        const location = { href: '' };
        vi.stubGlobal('window', { location });
        const fetchMock = vi.fn().mockResolvedValue(response(403));
        vi.stubGlobal('fetch', fetchMock);

        await expect(
            fetchData({
                url: 'https://api.test/service/agencyadmin/agencies/42',
                method: FETCH_METHODS.GET,
                responseHandling: [FETCH_ERRORS.FORBIDDEN_SILENT],
            }),
        ).rejects.toThrow(FETCH_ERRORS.NOT_ALLOWED);

        expect(location.href).toBe('');
    });

    it('rejects a 403 locally without redirecting when FORBIDDEN handling is requested', async () => {
        const location = { href: '' };
        vi.stubGlobal('window', { location });
        const fetchMock = vi.fn().mockResolvedValue(response(403));
        vi.stubGlobal('fetch', fetchMock);

        await expect(
            fetchData({
                url: 'https://api.test/service/useradmin/statistics/tutorials',
                method: FETCH_METHODS.GET,
                responseHandling: [FETCH_ERRORS.FORBIDDEN],
            }),
        ).rejects.toThrow(FETCH_ERRORS.FORBIDDEN);

        expect(location.href).toBe('');
    });

    // UserService#1006 (client half): a 403 on invite create carries the backend's
    // role explanation. Callers opting into FORBIDDEN_WITH_RESPONSE get the raw
    // Response (to read that message) and must NOT lose the page to the
    // access-denied redirect.
    it('rejects with the raw response on 403 when FORBIDDEN_WITH_RESPONSE is requested, without redirecting', async () => {
        const location = { href: '' };
        vi.stubGlobal('window', { location });
        const fetchMock = vi
            .fn()
            .mockResolvedValue(response(403, { message: 'Only platform admins can create administrative accounts' }));
        vi.stubGlobal('fetch', fetchMock);

        await expect(
            fetchData({
                url: 'https://api.test/service/useradmin/account-invites',
                method: FETCH_METHODS.POST,
                responseHandling: [FETCH_ERRORS.CATCH_ALL, FETCH_ERRORS.FORBIDDEN_WITH_RESPONSE],
                bodyData: JSON.stringify({ recipientEmail: 'neu@example.org' }),
            }),
        ).rejects.toMatchObject({ status: 403 });

        expect(location.href).toBe('');
        expect(logout).not.toHaveBeenCalled();
    });

    // Dead-session UX: when the refresh fails and we fall back to logout, the
    // admin must be TOLD the session expired instead of watching a spinner or a
    // silent redirect.
    it('shows the session-expired toast when falling back to logout', async () => {
        const fetchMock = vi.fn().mockResolvedValue(response(401));
        vi.stubGlobal('fetch', fetchMock);
        tryRefreshAccessToken.mockResolvedValue(false);

        await expect(createAgency()).rejects.toThrow(FETCH_ERRORS.UNAUTHORIZED);

        expect(logout).toHaveBeenCalledTimes(1);
        expect(messageError).toHaveBeenCalledTimes(1);
        // i18next is mocked as t: (key) => key, so the content IS the key.
        expect(messageError.mock.calls[0][0]).toMatchObject({ content: 'message.error.sessionExpired' });
    });

    // AD-H07 / #143: every request must eventually fail instead of hanging forever.
    it('aborts a hanging request after the 30s default timeout and rejects with TIMEOUT', async () => {
        vi.useFakeTimers();
        // A fetch that never settles on its own but honours the abort signal —
        // exactly a stalled backend / dead connection.
        const fetchMock = vi.fn(
            (request: Request) =>
                new Promise((_resolve, reject) => {
                    request.signal.addEventListener('abort', () => {
                        const abortError = new Error('aborted');
                        abortError.name = 'AbortError';
                        reject(abortError);
                    });
                }),
        );
        vi.stubGlobal('fetch', fetchMock);

        const pending = fetchData({
            url: 'https://api.test/service/settings',
            method: FETCH_METHODS.GET,
            skipAuth: true,
        });
        const assertion = expect(pending).rejects.toThrow(FETCH_ERRORS.TIMEOUT);

        // Just before 30s the request is still in flight — the default has not
        // fired early. It only aborts once the 30s window elapses.
        let settled = false;
        pending.catch(() => {
            settled = true;
        });
        await vi.advanceTimersByTimeAsync(29_999);
        expect(settled).toBe(false);
        await vi.advanceTimersByTimeAsync(1);
        await assertion;
    });

    it('honours an explicit shorter timeout', async () => {
        vi.useFakeTimers();
        const fetchMock = vi.fn(
            (request: Request) =>
                new Promise((_resolve, reject) => {
                    request.signal.addEventListener('abort', () => {
                        const abortError = new Error('aborted');
                        abortError.name = 'AbortError';
                        reject(abortError);
                    });
                }),
        );
        vi.stubGlobal('fetch', fetchMock);

        const pending = fetchData({
            url: 'https://api.test/service/settings',
            method: FETCH_METHODS.GET,
            skipAuth: true,
            timeout: 5_000,
        });
        const assertion = expect(pending).rejects.toThrow(FETCH_ERRORS.TIMEOUT);

        await vi.advanceTimersByTimeAsync(5_000);
        await assertion;
    });
});
