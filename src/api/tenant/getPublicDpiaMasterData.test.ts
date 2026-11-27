// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getPublicDpiaMasterData } from './getPublicDpiaMasterData';

const auth = vi.hoisted(() => ({ refresh: vi.fn(), logout: vi.fn() }));
vi.mock('../auth/auth', () => ({
    getAccessTokenForRequests: () => 'unused-test-token',
    tryRefreshAccessToken: auth.refresh,
}));
vi.mock('../auth/logout', () => ({ default: auth.logout }));
vi.mock('../../utils/generateCsrfToken', () => ({ default: () => 'test-csrf' }));
vi.mock('../../utils/language', () => ({ DEFAULT_LANGUAGE: 'de', normalizeLanguage: (language: string) => language }));
vi.mock('../../appConfig', () => ({
    default: { login: '/admin/login' },
    CSRF_WHITELIST_HEADER: undefined,
    baseTenantPublicEndpoint: 'https://api.test/service/tenant/public',
}));
vi.mock('antd', () => ({ message: { error: vi.fn() } }));
vi.mock('i18next', () => ({ default: { resolvedLanguage: 'de', language: 'de', t: (key: string) => key } }));

afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
});

describe('public DPIA adapter through fetchData', () => {
    it('GETs the public endpoint without Authorization and returns the typed response unchanged', async () => {
        const data = { operator: { legalName: 'Test operator' }, keyFigures: { tenants: { count: 0 } } };
        const fetch = vi.fn().mockResolvedValue(Response.json(data));
        vi.stubGlobal('fetch', fetch);
        expect(await getPublicDpiaMasterData()).toEqual(data);
        const request = fetch.mock.calls[0][0] as Request;
        expect(request.url).toBe('https://api.test/service/tenant/public/dpia');
        expect(request.method).toBe('GET');
        expect(request.headers.has('Authorization')).toBe(false);
    });
    it('preserves a null public response as missing data', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(null)));
        expect(await getPublicDpiaMasterData()).toBeNull();
    });
    it.each([401, 403, 404, 503])('rejects HTTP %s without login, token refresh or navigation', async (status) => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status })));
        const location = { href: '/current-dpia-document' };
        vi.stubGlobal('window', { location });
        await expect(getPublicDpiaMasterData()).rejects.toBeDefined();
        expect(location.href).toBe('/current-dpia-document');
        expect(auth.refresh).not.toHaveBeenCalled();
        expect(auth.logout).not.toHaveBeenCalled();
    });
});
