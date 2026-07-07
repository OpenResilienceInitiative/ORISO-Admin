const AUTH_ACCESS_TOKEN_COOKIE = 'keycloak';
const AUTH_REFRESH_TOKEN_COOKIE = 'refreshToken';

const readEnv = (...keys) => {
    for (const key of keys) {
        const value = process.env[key];
        if (value !== undefined && value !== '') {
            return value;
        }
    }
    return undefined;
};

const readBooleanEnv = (key, defaultValue) => {
    const value = readEnv(key);
    if (value === undefined) {
        return defaultValue;
    }
    return value !== 'false';
};

const stripUrlProtocol = (value) => value.replace(/^https?:\/\//, '').replace(/\/$/, '');

const toAbsoluteUrl = (value, useHttps) => {
    if (!value) {
        return '';
    }

    if (/^https?:\/\//i.test(value)) {
        return value.replace(/\/$/, '');
    }

    const protocol = useHttps ? 'https' : 'http';
    return `${protocol}://${stripUrlProtocol(value)}`;
};

const getAuthBffConfig = () => {
    const useHttps = readBooleanEnv('VITE_USE_HTTPS', readBooleanEnv('REACT_APP_USE_HTTPS', true));
    const apiHost = stripUrlProtocol(readEnv('VITE_API_URL', 'REACT_APP_API_URL') || '');
    const keycloakHost = readEnv('VITE_KEYCLOAK_URL', 'REACT_APP_KEYCLOAK_URL');
    const keycloakBaseUrl = keycloakHost ? toAbsoluteUrl(keycloakHost, useHttps) : '';
    const keycloakRealm = readEnv('VITE_KEYCLOAK_REALM', 'REACT_APP_KEYCLOAK_REALM') || 'online-beratung';
    const keycloakClientId = readEnv('VITE_KEYCLOAK_CLIENT_ID', 'REACT_APP_KEYCLOAK_CLIENT_ID') || 'app';
    const apiBaseUrl = apiHost ? toAbsoluteUrl(apiHost, useHttps) : 'http://localhost';
    const realmBaseUrl = keycloakBaseUrl ? `${keycloakBaseUrl}/realms` : `${apiBaseUrl}/auth/realms`;
    const loginEndpoint = `${realmBaseUrl}/${keycloakRealm}/protocol/openid-connect/token`;

    return {
        cookieDomain: readEnv('VITE_COOKIE_DOMAIN', 'REACT_APP_COOKIE_DOMAIN') || '',
        cookiePath: readEnv('VITE_AUTH_COOKIE_PATH', 'REACT_APP_AUTH_COOKIE_PATH') || '/admin',
        cookieSecure: readBooleanEnv('VITE_COOKIE_SECURE', readBooleanEnv('REACT_APP_COOKIE_SECURE', useHttps)),
        loginEndpoint,
        keycloakClientId,
    };
};

const buildAuthCookieAttributes = (config, { httpOnly = true, maxAge } = {}) => {
    const secure = config.cookieSecure ? '; Secure' : '';
    const domain = config.cookieDomain ? `; Domain=${config.cookieDomain}` : '';
    const httpOnlyFlag = httpOnly ? '; HttpOnly' : '';
    const maxAgeFlag = typeof maxAge === 'number' && maxAge > 0 ? `; Max-Age=${Math.floor(maxAge)}` : '';
    const path = config.cookiePath || '/admin';

    return `; Path=${path}; SameSite=Strict${secure}${domain}${httpOnlyFlag}${maxAgeFlag}`;
};

const parseCookies = (cookieHeader = '') =>
    cookieHeader.split(';').reduce((cookies, entry) => {
        const [rawName, ...rawValueParts] = entry.trim().split('=');
        if (!rawName) {
            return cookies;
        }
        cookies[rawName] = decodeURIComponent(rawValueParts.join('='));
        return cookies;
    }, {});

const appendSetCookie = (response, cookieValue) => {
    const existing = response.getHeader('Set-Cookie');
    if (!existing) {
        response.setHeader('Set-Cookie', cookieValue);
        return;
    }

    response.setHeader('Set-Cookie', Array.isArray(existing) ? [...existing, cookieValue] : [existing, cookieValue]);
};

const buildAuthTokenCookies = (config, payload) => {
    const cookies = buildRootPathAuthTokenClearCookies(config);

    if (payload.access_token) {
        cookies.push(
            `${AUTH_ACCESS_TOKEN_COOKIE}=${encodeURIComponent(payload.access_token)}${buildAuthCookieAttributes(
                config,
                {
                    maxAge: payload.expires_in,
                },
            )}`,
        );
    }

    if (payload.refresh_token) {
        cookies.push(
            `${AUTH_REFRESH_TOKEN_COOKIE}=${encodeURIComponent(payload.refresh_token)}${buildAuthCookieAttributes(
                config,
                {
                    maxAge: payload.refresh_expires_in,
                },
            )}`,
        );
    }

    return cookies;
};

const buildClearAuthTokenCookies = (config) => {
    const clearAttributes = buildAuthCookieAttributes(config, { httpOnly: true }).replace(
        /; Max-Age=\d+/,
        '; Max-Age=0',
    );

    return [
        `${AUTH_ACCESS_TOKEN_COOKIE}=; expires=Thu, 01 Jan 1970 00:00:00 GMT${clearAttributes}`,
        `${AUTH_REFRESH_TOKEN_COOKIE}=; expires=Thu, 01 Jan 1970 00:00:00 GMT${clearAttributes}`,
        ...buildRootPathAuthTokenClearCookies(config),
    ];
};

const buildRootPathAuthTokenClearCookies = (config) => {
    if (!config.cookiePath || config.cookiePath === '/') {
        return [];
    }

    const rootPathConfig = { ...config, cookiePath: '/' };
    const clearAttributes = buildAuthCookieAttributes(rootPathConfig, { httpOnly: true }).replace(
        /; Max-Age=\d+/,
        '; Max-Age=0',
    );

    return [
        `${AUTH_ACCESS_TOKEN_COOKIE}=; expires=Thu, 01 Jan 1970 00:00:00 GMT${clearAttributes}`,
        `${AUTH_REFRESH_TOKEN_COOKIE}=; expires=Thu, 01 Jan 1970 00:00:00 GMT${clearAttributes}`,
    ];
};

const readJsonBody = async (request) => {
    const chunks = [];
    for await (const chunk of request) {
        chunks.push(chunk);
    }

    if (chunks.length === 0) {
        return {};
    }

    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
};

const refreshWithKeycloak = async (config, refreshToken) => {
    const data = `refresh_token=${encodeURIComponent(refreshToken)}&client_id=${encodeURIComponent(
        config.keycloakClientId,
    )}&grant_type=refresh_token`;

    const response = await fetch(config.loginEndpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'cache-control': 'no-cache',
        },
        body: data,
    });

    if (!response.ok) {
        throw new Error('keycloakLogin');
    }

    return response.json();
};

const sendJson = (response, statusCode, payload) => {
    response.statusCode = statusCode;
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify(payload));
};

const handleSetToken = async (request, response, config) => {
    const payload = await readJsonBody(request);
    buildAuthTokenCookies(config, payload).forEach((cookie) => appendSetCookie(response, cookie));
    sendJson(response, 200, { ok: true });
};

const handleClearToken = (response, config) => {
    buildClearAuthTokenCookies(config).forEach((cookie) => appendSetCookie(response, cookie));
    sendJson(response, 200, { ok: true });
};

const handleSession = async (request, response, config) => {
    const cookies = parseCookies(request.headers.cookie);
    const accessToken = cookies[AUTH_ACCESS_TOKEN_COOKIE];
    const refreshToken = cookies[AUTH_REFRESH_TOKEN_COOKIE];

    if (!accessToken && !refreshToken) {
        response.statusCode = 401;
        response.end();
        return;
    }

    if (accessToken && refreshToken) {
        sendJson(response, 200, {
            access_token: accessToken,
            refresh_token: refreshToken,
        });
        return;
    }

    if (!refreshToken) {
        response.statusCode = 401;
        response.end();
        return;
    }

    try {
        const refreshed = await refreshWithKeycloak(config, refreshToken);
        buildAuthTokenCookies(config, refreshed).forEach((cookie) => appendSetCookie(response, cookie));
        sendJson(response, 200, refreshed);
    } catch {
        buildClearAuthTokenCookies(config).forEach((cookie) => appendSetCookie(response, cookie));
        response.statusCode = 401;
        response.end();
    }
};

const handleRefreshToken = async (request, response, config) => {
    const cookies = parseCookies(request.headers.cookie);
    const refreshToken = cookies[AUTH_REFRESH_TOKEN_COOKIE];

    if (!refreshToken) {
        response.statusCode = 401;
        response.end();
        return;
    }

    try {
        const refreshed = await refreshWithKeycloak(config, refreshToken);
        buildAuthTokenCookies(config, refreshed).forEach((cookie) => appendSetCookie(response, cookie));
        sendJson(response, 200, refreshed);
    } catch {
        buildClearAuthTokenCookies(config).forEach((cookie) => appendSetCookie(response, cookie));
        response.statusCode = 401;
        response.end();
    }
};

const AUTH_BFF_ROUTE_PATTERN = /\/auth\/(set-token|clear-token|session|refresh-token)(?:\?.*)?$/;

const matchesAuthRoute = (pathname, route) =>
    pathname.endsWith(`/admin/auth/${route}`) || pathname.endsWith(`/auth/${route}`);

const createAuthBffHandler = (configOverride = {}) => {
    const config = { ...getAuthBffConfig(), ...configOverride };

    return async (request, response) => {
        const url = new URL(request.url, 'http://localhost');
        const pathname = url.pathname.replace(/\/+$/, '');

        if (request.method === 'OPTIONS') {
            response.statusCode = 204;
            response.end();
            return;
        }

        try {
            if (request.method === 'POST' && matchesAuthRoute(pathname, 'set-token')) {
                await handleSetToken(request, response, config);
                return;
            }

            if (request.method === 'POST' && matchesAuthRoute(pathname, 'clear-token')) {
                handleClearToken(response, config);
                return;
            }

            if (request.method === 'GET' && matchesAuthRoute(pathname, 'session')) {
                await handleSession(request, response, config);
                return;
            }

            if (request.method === 'POST' && matchesAuthRoute(pathname, 'refresh-token')) {
                await handleRefreshToken(request, response, config);
                return;
            }

            response.statusCode = 404;
            response.end();
        } catch (error) {
            response.statusCode = 500;
            response.setHeader('Content-Type', 'application/json');
            response.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Auth BFF error' }));
        }
    };
};

export {
    AUTH_ACCESS_TOKEN_COOKIE,
    AUTH_BFF_ROUTE_PATTERN,
    AUTH_REFRESH_TOKEN_COOKIE,
    buildAuthCookieAttributes,
    createAuthBffHandler,
    getAuthBffConfig,
};
