// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { snackbarStore } from '../components/Snackbar/snackbarStore';
import { fetchData, FETCH_ERRORS, FETCH_METHODS } from './fetchData';

const refresh = vi.hoisted(() => vi.fn());
const logout = vi.hoisted(() => vi.fn());
vi.mock('./auth/auth', () => ({ getAccessTokenForRequests: () => 'test-access', tryRefreshAccessToken: refresh }));
vi.mock('./auth/logout', () => ({ default: logout }));
vi.mock('../utils/generateCsrfToken', () => ({ default: () => 'test-csrf' }));
vi.mock('../appConfig', () => ({ CSRF_WHITELIST_HEADER: '' }));
vi.mock('i18next', () => ({
    default: { language: 'en', t: (key: unknown) => (Array.isArray(key) ? key.at(-1) : key) },
}));

afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
});

/** Document identity only: no React/DOM rendering in this HTTP contract test. */
const asBrowser = () => {
    vi.stubGlobal('window', {});
    vi.stubGlobal('document', {});
};
const shown = () => {
    const { current, queued } = snackbarStore.getState();
    return [current, ...queued].filter(Boolean);
};
const request = (url = 'https://api.example.test/service/control') =>
    fetchData({ url, method: FETCH_METHODS.GET, responseHandling: [FETCH_ERRORS.CATCH_ALL] });

describe('transport feedback goes through the one snackbar channel', () => {
    it('shows an error snackbar for a failed CATCH_ALL request, from the i18n key and never a server string', async () => {
        asBrowser();
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('raw server text', { status: 500 })));
        await expect(request()).rejects.toThrow(FETCH_ERRORS.CATCH_ALL);
        expect(shown()).toHaveLength(1);
        expect(shown()[0]).toMatchObject({ severity: 'error', description: 'message.error.default', durationMs: null });
    });

    it('shows ONE snackbar when several requests fail for the same reason (the doubled Legal-tab toast)', async () => {
        asBrowser();
        vi.stubGlobal(
            'fetch',
            vi.fn().mockImplementation(async () => new Response(null, { status: 500 })),
        );
        const settled = await Promise.allSettled([
            request('https://api.example.test/service/tenants/1/legal/dpa/versions'),
            request('https://api.example.test/service/tenants/1/legal/dpa/drafts'),
            request('https://api.example.test/service/tenants/1/legal/dpa/versions'),
        ]);
        expect(settled.every((result) => result.status === 'rejected')).toBe(true);
        expect(shown()).toHaveLength(1);
    });

    it('shows one session-expired snackbar for concurrent 401s after a failed refresh, and logs out', async () => {
        asBrowser();
        refresh.mockResolvedValue(false);
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 401 })));
        const settled = await Promise.allSettled([request(), request(), request()]);
        expect(settled.every((result) => result.status === 'rejected')).toBe(true);
        expect(logout).toHaveBeenCalledWith(true);
        expect(shown()).toHaveLength(1);
        expect(shown()[0]).toMatchObject({ key: 'session-expired', description: 'message.error.sessionExpired' });
    });

    it('stays silent through a pending refresh and retry that succeeds', async () => {
        asBrowser();
        refresh.mockResolvedValue(true);
        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce(new Response(null, { status: 401 }))
            .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));
        vi.stubGlobal('fetch', fetchMock);
        await request();
        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(logout).not.toHaveBeenCalled();
        expect(shown()).toHaveLength(0);
    });

    it('preserves the bootstrap reject-only responseHandling[] contract without a generic toast', async () => {
        asBrowser();
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 500 })));
        await expect(
            fetchData({
                url: 'https://api.example.test/service/settings',
                method: FETCH_METHODS.GET,
                skipAuth: true,
                responseHandling: [],
            }),
        ).rejects.toThrow('API call error: 500');
        expect(shown()).toHaveLength(0);
    });

    it('shows nothing outside a browser (SSR, node): only the rejection remains', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 500 })));
        await expect(request()).rejects.toThrow(FETCH_ERRORS.CATCH_ALL);
        expect(shown()).toHaveLength(0);
    });
});
