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
    APP_URL: pick('VITE_APP_URL', 'REACT_APP_APP_URL'),
    MATRIX_URL: pick('VITE_MATRIX_URL', 'REACT_APP_MATRIX_URL'),
    KEYCLOAK_REALM: pick('VITE_KEYCLOAK_REALM', 'REACT_APP_KEYCLOAK_REALM'),
    KEYCLOAK_CLIENT_ID: pick('VITE_KEYCLOAK_CLIENT_ID', 'REACT_APP_KEYCLOAK_CLIENT_ID'),
    USE_API_URL: pick('VITE_USE_API_URL', 'REACT_APP_USE_API_URL'),
    USE_HTTPS: pick('VITE_USE_HTTPS', 'REACT_APP_USE_HTTPS'),
    COOKIE_DOMAIN: pick('VITE_COOKIE_DOMAIN', 'REACT_APP_COOKIE_DOMAIN'),
    COOKIE_SECURE: pick('VITE_COOKIE_SECURE', 'REACT_APP_COOKIE_SECURE'),
    CSRF_WHITELIST_HEADER: pick(
        'VITE_CSRF_WHITELIST_HEADER',
        'VITE_CSRF_WHITELIST_HEADER_FOR_LOCAL_DEVELOPMENT',
        'REACT_APP_CSRF_WHITELIST_HEADER',
    ),
    COOKIES_ALLOWEDLIST: pick('VITE_COOKIES_ALLOWEDLIST', 'REACT_APP_COOKIES_ALLOWEDLIST'),
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
