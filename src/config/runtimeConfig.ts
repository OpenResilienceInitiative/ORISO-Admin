import getLocationVariables from '../utils/getLocationVariables';
import type { AppRuntimeConfig } from '../types/runtimeConfig';

// Runtime config is injected by public/env.js in production deployments.
// eslint-disable-next-line no-underscore-dangle
const runtime = (): AppRuntimeConfig => window.__APP_CONFIG__ ?? {};

const readEnvString = (key: string): string | undefined => {
    const value = import.meta.env[key as keyof ImportMetaEnv];
    return typeof value === 'string' && value !== '' ? value : undefined;
};

const readConfigValue = (...keys: string[]): string | undefined => {
    const rt = runtime();
    const resolvedKey = keys.find((key) => {
        const runtimeValue = rt[key as keyof AppRuntimeConfig];
        if (runtimeValue !== undefined && runtimeValue !== '') {
            return true;
        }

        if (readEnvString(`VITE_${key}`)) {
            return true;
        }

        if (readEnvString(`REACT_APP_${key}`)) {
            return true;
        }

        return false;
    });

    if (!resolvedKey) {
        return undefined;
    }

    const runtimeValue = rt[resolvedKey as keyof AppRuntimeConfig];
    if (runtimeValue !== undefined && runtimeValue !== '') {
        return runtimeValue;
    }

    return readEnvString(`VITE_${resolvedKey}`) ?? readEnvString(`REACT_APP_${resolvedKey}`);
};

const readBooleanConfig = (key: keyof AppRuntimeConfig, defaultValue: boolean): boolean => {
    const value = readConfigValue(key);
    if (value === undefined) {
        return defaultValue;
    }
    return value !== 'false';
};

const stripUrlProtocol = (value: string): string => value.replace(/^https?:\/\//, '').replace(/\/$/, '');

const toAbsoluteUrl = (value: string | undefined, useHttps: boolean): string => {
    if (!value) {
        return '';
    }

    if (/^https?:\/\//i.test(value)) {
        return value.replace(/\/$/, '');
    }

    const protocol = useHttps ? 'https' : 'http';
    return `${protocol}://${stripUrlProtocol(value)}`;
};

const useHttps = readBooleanConfig('USE_HTTPS', true);
const useApiUrl = readBooleanConfig('USE_API_URL', true);
const { subdomain, origin } = getLocationVariables();

const apiHost = stripUrlProtocol(readConfigValue('API_URL') ?? '');
const keycloakHost = readConfigValue('KEYCLOAK_URL');
const keycloakBaseUrl = keycloakHost ? toAbsoluteUrl(keycloakHost, useHttps) : '';
const configuredAppHost = stripUrlProtocol(readConfigValue('APP_URL') ?? '');
const appHost = configuredAppHost || apiHost.replace(/^api\./i, 'app.');
const matrixHost = stripUrlProtocol(readConfigValue('MATRIX_URL') ?? '');

let apiBaseUrl = origin;

if (useApiUrl && apiHost) {
    apiBaseUrl = toAbsoluteUrl(apiHost, useHttps);
} else if (origin.includes('localhost') && apiHost) {
    const hostPrefix = subdomain && subdomain !== 'localhost' ? `${subdomain}.` : '';
    apiBaseUrl = toAbsoluteUrl(`${hostPrefix}${apiHost}`, useHttps);
}

export const runtimeConfig = {
    useHttps,
    useApiUrl,
    apiBaseUrl,
    keycloakBaseUrl,
    appBaseUrl: toAbsoluteUrl(appHost, useHttps) || apiBaseUrl,
    matrixBaseUrl: matrixHost ? toAbsoluteUrl(matrixHost, useHttps) : '',
    keycloakRealm: readConfigValue('KEYCLOAK_REALM') ?? 'online-beratung',
    keycloakClientId: readConfigValue('KEYCLOAK_CLIENT_ID') ?? 'app',
    csrfWhitelistHeader:
        readConfigValue('CSRF_WHITELIST_HEADER') ??
        readEnvString('VITE_CSRF_WHITELIST_HEADER_FOR_LOCAL_DEVELOPMENT') ??
        '',
    cookieDomain: readConfigValue('COOKIE_DOMAIN') ?? '',
    cookieSecure: readBooleanConfig('COOKIE_SECURE', true),
    cookiesAllowedList: (readConfigValue('COOKIES_ALLOWEDLIST') ?? '')
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean),
};

// Dedicated Keycloak hosts use {KEYCLOAK_URL}/realms/{realm}/...
// Legacy API-hosted auth falls back to {API_URL}/auth/realms/{realm}/...
export const keycloakAuthPath = (path: string) => {
    const realmBaseUrl = runtimeConfig.keycloakBaseUrl
        ? `${runtimeConfig.keycloakBaseUrl}/realms`
        : `${runtimeConfig.apiBaseUrl}/auth/realms`;

    return `${realmBaseUrl}/${runtimeConfig.keycloakRealm}${path}`;
};
