#!/usr/bin/env node

/**
 * Generates public/env.js from environment variables at container/runtime.
 * Supports both VITE_* and REACT_APP_* names used by DevOps.
 */

const fs = require('fs');
const path = require('path');

const pick = (...keys) => {
    for (const key of keys) {
        const value = process.env[key];
        if (value !== undefined && value !== '') {
            return value;
        }
    }
    return undefined;
};

const config = {
    API_URL: pick('VITE_API_URL', 'REACT_APP_API_URL'),
    KEYCLOAK_URL: pick('VITE_KEYCLOAK_URL', 'REACT_APP_KEYCLOAK_URL'),
    USER_SERVICE_ORIGIN: pick('VITE_USER_SERVICE_ORIGIN', 'REACT_APP_USER_SERVICE_ORIGIN'),
    AGENCY_SERVICE_ORIGIN: pick('VITE_AGENCY_SERVICE_ORIGIN', 'REACT_APP_AGENCY_SERVICE_ORIGIN'),
    TENANT_SERVICE_ORIGIN: pick('VITE_TENANT_SERVICE_ORIGIN', 'REACT_APP_TENANT_SERVICE_ORIGIN'),
    CONSULTING_TYPE_SERVICE_ORIGIN: pick(
        'VITE_CONSULTING_TYPE_SERVICE_ORIGIN',
        'REACT_APP_CONSULTING_TYPE_SERVICE_ORIGIN',
    ),
    KEYCLOAK_ORIGIN: pick('VITE_KEYCLOAK_ORIGIN', 'REACT_APP_KEYCLOAK_ORIGIN'),
    APP_URL: pick('VITE_APP_URL', 'REACT_APP_APP_URL'),
    MATRIX_URL: pick('VITE_MATRIX_URL', 'REACT_APP_MATRIX_URL'),
    KEYCLOAK_REALM: pick('VITE_KEYCLOAK_REALM', 'REACT_APP_KEYCLOAK_REALM'),
    KEYCLOAK_CLIENT_ID: pick('VITE_KEYCLOAK_CLIENT_ID', 'REACT_APP_KEYCLOAK_CLIENT_ID'),
    USE_API_URL: pick('VITE_USE_API_URL', 'REACT_APP_USE_API_URL'),
    USE_HTTPS: pick('VITE_USE_HTTPS', 'REACT_APP_USE_HTTPS'),
    COOKIE_DOMAIN: pick('VITE_COOKIE_DOMAIN', 'REACT_APP_COOKIE_DOMAIN'),
    COOKIE_SECURE: pick('VITE_COOKIE_SECURE', 'REACT_APP_COOKIE_SECURE'),
    HOSTNAMES_WITHOUT_COOKIE_DOMAIN: pick(
        'VITE_HOSTNAMES_WITHOUT_COOKIE_DOMAIN',
        'REACT_APP_HOSTNAMES_WITHOUT_COOKIE_DOMAIN',
    ),
    CSRF_WHITELIST_HEADER: pick(
        'VITE_CSRF_WHITELIST_HEADER',
        'VITE_CSRF_WHITELIST_HEADER_FOR_LOCAL_DEVELOPMENT',
        'REACT_APP_CSRF_WHITELIST_HEADER',
    ),
    COOKIES_ALLOWEDLIST: pick('VITE_COOKIES_ALLOWEDLIST', 'REACT_APP_COOKIES_ALLOWEDLIST'),
    OBSERVABILITY_ENABLED: pick('VITE_OBSERVABILITY_ENABLED', 'REACT_APP_OBSERVABILITY_ENABLED'),
    // Opt-in: set only where a content scanner runs and the AI sub-processor
    // agreement is signed (ADR-019, ORISO-Admin#734).
    MEDIA_AI_SCAN_AVAILABLE: pick('VITE_MEDIA_AI_SCAN_AVAILABLE', 'REACT_APP_MEDIA_AI_SCAN_AVAILABLE'),
    OTEL_METRICS_URL: pick('VITE_OTEL_METRICS_URL', 'REACT_APP_OTEL_METRICS_URL'),
    OTEL_EXPORT_INTERVAL_MS: pick('VITE_OTEL_EXPORT_INTERVAL_MS', 'REACT_APP_OTEL_EXPORT_INTERVAL_MS'),
    PLATFORM_VERSION: pick('VITE_PLATFORM_VERSION', 'REACT_APP_PLATFORM_VERSION'),
};

Object.keys(config).forEach((key) => {
    if (config[key] === undefined) {
        delete config[key];
    }
});

const outputPath = process.argv[2] || path.join(__dirname, '..', 'public', 'env.js');
const contents = `window.__APP_CONFIG__ = ${JSON.stringify(config, null, 4)};\n`;

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, contents, 'utf8');

console.log(`Generated runtime config: ${outputPath}`);
