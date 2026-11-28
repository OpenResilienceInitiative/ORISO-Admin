// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';

vi.mock('../auth/auth', () => ({
    getAccessTokenForRequests: () => 'admin-token',
    tryRefreshAccessToken: vi.fn(),
}));
vi.mock('../auth/logout', () => ({ default: vi.fn() }));
vi.mock('../../utils/generateCsrfToken', () => ({ default: () => 'csrf-token' }));
vi.mock('../../utils/language', () => ({ DEFAULT_LANGUAGE: 'de', normalizeLanguage: (language: string) => language }));
vi.mock('../../appConfig', () => ({
    topicAdminEndpoint: 'https://api.example/service/topicadmin',
    CSRF_WHITELIST_HEADER: '',
    default: { login: '/admin/login' },
}));
vi.mock('i18next', () => ({ default: { resolvedLanguage: 'de', language: 'de', t: (key: unknown) => key } }));

// eslint-disable-next-line import/first
import getTopicData from './getTopicData';

describe('topic list HTTP contract (#1504)', () => {
    beforeEach(() => {
        vi.stubGlobal('window', { location: { href: '/admin/theme-settings/topics' } });
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 403 })));
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('rejects a 403 with FORBIDDEN and leaves the page where it is', async () => {
        await expect(getTopicData({ current: 1, pageSize: 500 })).rejects.toThrow('FORBIDDEN');
        expect(window.location.href).toBe('/admin/theme-settings/topics');
    });
});
