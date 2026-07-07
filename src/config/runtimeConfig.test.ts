// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';

const runtimeEnvKeys = [
    'USE_HTTPS',
    'USE_API_URL',
    'API_URL',
    'COOKIE_DOMAIN',
    'COOKIE_SECURE',
    'HOSTNAMES_WITHOUT_COOKIE_DOMAIN',
];

const loadRuntimeConfig = async (config: Record<string, string | undefined>) => {
    vi.resetModules();
    window.history.pushState({}, '', '/admin/login');
    runtimeEnvKeys.forEach((key) => {
        vi.stubEnv(`VITE_${key}`, '');
        vi.stubEnv(`REACT_APP_${key}`, '');
    });
    window.__APP_CONFIG__ = config;

    return import('./runtimeConfig');
};

afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
    window.__APP_CONFIG__ = {};
});

describe('runtimeConfig cookie domain', () => {
    it('omits the shared cookie domain on configured local hostnames', async () => {
        const { runtimeConfig } = await loadRuntimeConfig({
            API_URL: 'api.oriso-dev.site',
            COOKIE_DOMAIN: '.oriso-dev.site',
            HOSTNAMES_WITHOUT_COOKIE_DOMAIN: 'localhost,127.0.0.1',
        });

        expect(runtimeConfig.cookieDomain).toBe('');
    });

    it('keeps the shared cookie domain on regular deployment hostnames', async () => {
        const { runtimeConfig } = await loadRuntimeConfig({
            API_URL: 'api.oriso-dev.site',
            COOKIE_DOMAIN: '.oriso-dev.site',
            HOSTNAMES_WITHOUT_COOKIE_DOMAIN: '127.0.0.1',
        });

        expect(runtimeConfig.cookieDomain).toBe('.oriso-dev.site');
    });
});
