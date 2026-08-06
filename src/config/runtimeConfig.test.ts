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
    Object.assign(window, {
        _env_: {},
        __ENV__: {},
        env: {},
    });
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

    it('reads legacy runtime env.js globals still used by PreDev deployments', async () => {
        vi.resetModules();
        runtimeEnvKeys.forEach((key) => {
            vi.stubEnv(`VITE_${key}`, '');
            vi.stubEnv(`REACT_APP_${key}`, '');
        });
        window.__APP_CONFIG__ = undefined;
        Object.assign(window, {
            _env_: {
                API_URL: 'https://api.oriso-dev.site',
                KEYCLOAK_URL: 'https://auth.oriso-dev.site',
            },
        });

        const { keycloakAuthPath, runtimeConfig } = await import('./runtimeConfig');

        expect(runtimeConfig.keycloakBaseUrl).toBe('https://auth.oriso-dev.site');
        expect(keycloakAuthPath('/protocol/openid-connect/token')).toBe(
            'https://auth.oriso-dev.site/realms/online-beratung/protocol/openid-connect/token',
        );
    });
});

describe('runtimeConfig observability', () => {
    it('is disabled without an explicit runtime opt-in', async () => {
        const { runtimeConfig } = await loadRuntimeConfig({});

        expect(runtimeConfig.observabilityEnabled).toBe(false);
        expect(runtimeConfig.otelMetricsUrl).toBe('');
        expect(runtimeConfig.otelExportIntervalMillis).toBe(60000);
    });

    it('accepts a valid runtime endpoint and interval', async () => {
        const { runtimeConfig } = await loadRuntimeConfig({
            OBSERVABILITY_ENABLED: 'TRUE',
            OTEL_METRICS_URL: 'https://collector.example.test/v1/metrics',
            OTEL_EXPORT_INTERVAL_MS: '45000',
        });

        expect(runtimeConfig.observabilityEnabled).toBe(true);
        expect(runtimeConfig.otelMetricsUrl).toBe('https://collector.example.test/v1/metrics');
        expect(runtimeConfig.otelExportIntervalMillis).toBe(45000);
    });

    it('rejects invalid endpoints and too-frequent intervals', async () => {
        const { runtimeConfig } = await loadRuntimeConfig({
            OBSERVABILITY_ENABLED: 'yes',
            OTEL_METRICS_URL: 'file:///tmp/metrics',
            OTEL_EXPORT_INTERVAL_MS: '1000',
        });

        expect(runtimeConfig.observabilityEnabled).toBe(false);
        expect(runtimeConfig.otelMetricsUrl).toBe('');
        expect(runtimeConfig.otelExportIntervalMillis).toBe(60000);
    });
});
