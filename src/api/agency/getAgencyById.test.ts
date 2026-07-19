// @vitest-environment node
// Node env for the same reason as fetchData.test.ts: fetch/Request/AbortController
// all come from the same realm as the code under test.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const messageError = vi.fn();
vi.mock('antd', () => ({ message: { error: (...args: unknown[]) => messageError(...args) } }));
vi.mock('i18next', () => ({ default: { resolvedLanguage: 'de', language: 'de', t: (keys: unknown) => keys } }));

vi.mock('../auth/auth', () => ({
    getAccessTokenForRequests: () => 'access-token',
    tryRefreshAccessToken: () => Promise.resolve(false),
}));
vi.mock('../auth/logout', () => ({ default: vi.fn() }));
vi.mock('../../utils/generateCsrfToken', () => ({ default: () => 'csrf-token' }));
vi.mock('../../utils/language', () => ({ DEFAULT_LANGUAGE: 'de', normalizeLanguage: (lang: string) => lang }));
vi.mock('../../appConfig', () => ({
    default: { login: '/admin/login' },
    agencyDataAgencyId: (agencyId: string) => `https://api.test/service/agencyadmin/agencies/${agencyId}`,
    CSRF_WHITELIST_HEADER: '',
}));

// eslint-disable-next-line import/first
import getAgencyDataById, { AgencyAccessError } from './getAgencyById';

const response = (status: number, body: Record<string, unknown> = {}) => ({
    status,
    headers: { get: () => null },
    json: async () => body,
});

describe('getAgencyDataById', () => {
    beforeEach(() => {
        messageError.mockReset();
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('resolves with the agency payload on success', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(200, { _embedded: { id: '42', name: 'Test' } })));

        const result = await getAgencyDataById('42');

        expect(result).toEqual({ _embedded: { id: '42', name: 'Test' } });
        expect(messageError).not.toHaveBeenCalled();
    });

    it('rejects with AgencyAccessError on a 404 (non-existent agency), without showing a toast', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(404)));

        await expect(getAgencyDataById('does-not-exist')).rejects.toBeInstanceOf(AgencyAccessError);
        expect(messageError).not.toHaveBeenCalled();
    });

    it('rejects with AgencyAccessError on a 403 (inaccessible agency), without showing a toast', async () => {
        vi.stubGlobal('window', { location: { href: '' } });
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(403)));

        await expect(getAgencyDataById('foreign-tenant-agency')).rejects.toBeInstanceOf(AgencyAccessError);
        expect(messageError).not.toHaveBeenCalled();
    });

    it('does not hard-redirect the tab on a 403 (inline handling, not the global access-denied page)', async () => {
        const location = { href: '' };
        vi.stubGlobal('window', { location });
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(403)));

        await expect(getAgencyDataById('foreign-tenant-agency')).rejects.toBeInstanceOf(AgencyAccessError);
        expect(location.href).toBe('');
    });

    it('keeps the generic error toast for a 5xx failure and does not throw AgencyAccessError', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(500)));

        const failure = getAgencyDataById('42');

        await expect(failure).rejects.not.toBeInstanceOf(AgencyAccessError);
        expect(messageError).toHaveBeenCalledTimes(1);
    });
});
