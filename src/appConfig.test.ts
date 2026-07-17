// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AppRuntimeConfig } from './types/runtimeConfig';

const serviceOriginKeys = [
    'USER_SERVICE_ORIGIN',
    'AGENCY_SERVICE_ORIGIN',
    'TENANT_SERVICE_ORIGIN',
    'CONSULTING_TYPE_SERVICE_ORIGIN',
    'KEYCLOAK_ORIGIN',
];

// Every runtime-config key, so the test is hermetic and ignores any ambient
// .env (e.g. a local api.oriso.org config) — config is driven solely by
// window.__APP_CONFIG__ below.
const runtimeEnvKeys = [
    ...serviceOriginKeys,
    'USE_HTTPS',
    'USE_API_URL',
    'API_URL',
    'KEYCLOAK_URL',
    'APP_URL',
    'MATRIX_URL',
    'KEYCLOAK_REALM',
    'KEYCLOAK_CLIENT_ID',
    'COOKIE_DOMAIN',
    'COOKIE_SECURE',
    'HOSTNAMES_WITHOUT_COOKIE_DOMAIN',
];

const loadAppConfig = async (config: AppRuntimeConfig = {}) => {
    vi.resetModules();
    runtimeEnvKeys.forEach((key) => {
        vi.stubEnv(`VITE_${key}`, '');
        vi.stubEnv(`REACT_APP_${key}`, '');
    });
    window.__APP_CONFIG__ = {
        API_URL: 'https://api.oriso.org',
        KEYCLOAK_URL: '',
        ...config,
    };

    return import('./appConfig');
};

afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
    window.__APP_CONFIG__ = {};
});

describe('appConfig service origins', () => {
    it('uses service-specific origins when configured', async () => {
        const config = await loadAppConfig({
            USER_SERVICE_ORIGIN: 'http://localhost:8082/',
            TENANT_SERVICE_ORIGIN: 'http://localhost:8081',
            AGENCY_SERVICE_ORIGIN: 'http://localhost:8084',
            CONSULTING_TYPE_SERVICE_ORIGIN: 'http://localhost:8083',
            KEYCLOAK_ORIGIN: 'http://localhost:8080',
        });

        expect(config.userDataEndpoint).toBe('http://localhost:8082/service/users/data');
        expect(config.invitelinksEndpoint).toBe('http://localhost:8082/service/useradmin/invitelinks');
        expect(config.tenantAdminEndpoint).toBe('http://localhost:8081/service/tenantadmin');
        expect(config.agencyEndpointBase).toBe('http://localhost:8084/service/agencyadmin/agencies');
        expect(config.topicAdminEndpoint).toBe('http://localhost:8084/service/topicadmin');
        expect(config.consultingTypeEndpoint).toBe('http://localhost:8083/service/consultingtypes');
        expect(config.serverSettingsEndpoint).toBe('http://localhost:8083/service/settings');
        expect(config.loginEndpoint).toBe(
            'http://localhost:8080/auth/realms/online-beratung/protocol/openid-connect/token',
        );
        expect(config.registrationDataEndpoint).toBe('https://api.oriso.org/service/statistics/registration');
    });

    it('falls back to the broad API origin when service origins are absent', async () => {
        const config = await loadAppConfig();

        expect(config.userDataEndpoint).toBe('https://api.oriso.org/service/users/data');
        expect(config.tenantAdminEndpoint).toBe('https://api.oriso.org/service/tenantadmin');
        expect(config.agencyEndpointBase).toBe('https://api.oriso.org/service/agencyadmin/agencies');
        expect(config.consultingTypeEndpoint).toBe('https://api.oriso.org/service/consultingtypes');
        expect(config.loginEndpoint).toBe(
            'https://api.oriso.org/auth/realms/online-beratung/protocol/openid-connect/token',
        );
    });

    it('preserves an explicit API URL protocol when USE_HTTPS is false for local development', async () => {
        const config = await loadAppConfig({
            USE_HTTPS: 'false',
        });

        expect(config.tenantAccessEndpoint).toBe('https://api.oriso.org/service/tenant/access');
    });
});
