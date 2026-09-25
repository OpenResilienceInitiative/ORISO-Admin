import { Readable } from 'node:stream';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
    AUTH_ACCESS_TOKEN_COOKIE,
    AUTH_REFRESH_TOKEN_COOKIE,
    buildAuthCookieAttributes,
    createAuthBffHandler,
    getAuthBffConfig,
    getRequestAuthBffConfig,
} from './auth-bff-handlers.mjs';

describe('auth BFF cookie domain', () => {
    const config = {
        cookieDomain: '.oriso-dev.site',
        cookiePath: '/admin',
        cookieSecure: true,
        hostnamesWithoutCookieDomain: ['localhost', '127.0.0.1'],
    };

    it('omits Domain for configured local request hostnames', () => {
        const effective = getRequestAuthBffConfig(config, { headers: { host: 'localhost:9002' } });

        expect(buildAuthCookieAttributes(effective)).toBe('; Path=/admin; SameSite=Strict; Secure; HttpOnly');
    });

    it('keeps Domain for deployment request hostnames', () => {
        const effective = getRequestAuthBffConfig(config, { headers: { host: 'admin.oriso-dev.site' } });

        expect(buildAuthCookieAttributes(effective)).toBe(
            '; Path=/admin; SameSite=Strict; Secure; Domain=.oriso-dev.site; HttpOnly',
        );
    });
});

/**
 * The Admin runs on the same host as the counselling app (dev.example.org/admin next to
 * dev.example.org/app). The app keeps its own session in the cookies `keycloak` and `refreshToken`
 * on Path=/, and the browser sends those to /admin as well. The BFF therefore must use cookie
 * names of its own and must never write to Path=/ — before this, the Admin picked up the app
 * user's token, and every Admin login or logout deleted the app session.
 */
describe('auth BFF on a host shared with the counselling app', () => {
    const APP_COOKIES = 'keycloak=app-access; refreshToken=app-refresh';

    const createHandler = (overrides = {}) =>
        createAuthBffHandler({
            cookieDomain: '',
            cookiePath: '/admin',
            cookieSecure: true,
            hostnamesWithoutCookieDomain: [],
            loginEndpoint: 'http://keycloak.test/token',
            keycloakClientId: 'app',
            ...overrides,
        });

    const call = async (method, url, { cookie, body, config } = {}) => {
        const request = Readable.from(body ? [Buffer.from(JSON.stringify(body))] : []);
        Object.assign(request, { method, url, headers: { host: 'dev.example.org', ...(cookie ? { cookie } : {}) } });
        const headers = {};
        const response = {
            statusCode: 200,
            body: '',
            setHeader: (name, value) => {
                headers[name.toLowerCase()] = value;
            },
            getHeader: (name) => headers[name.toLowerCase()],
            end: (chunk = '') => {
                response.body = String(chunk);
            },
        };
        await createHandler(config)(request, response);
        const setCookie = headers['set-cookie'];
        return {
            status: response.statusCode,
            json: response.body ? JSON.parse(response.body) : undefined,
            setCookies: Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [],
        };
    };

    const cookiesOnPath = (setCookies, path) => setCookies.filter((cookie) => cookie.includes(`; Path=${path};`));

    it('stores the Admin tokens under its own cookie names, on /admin only', async () => {
        const { status, setCookies } = await call('POST', '/admin/auth/set-token', {
            body: {
                access_token: 'admin-access',
                refresh_token: 'admin-refresh',
                expires_in: 60,
                refresh_expires_in: 30,
            },
        });

        expect(status).toBe(200);
        expect(setCookies).toContainEqual(
            expect.stringMatching(new RegExp(`^${AUTH_ACCESS_TOKEN_COOKIE}=admin-access;`)),
        );
        expect(setCookies).toContainEqual(
            expect.stringMatching(new RegExp(`^${AUTH_REFRESH_TOKEN_COOKIE}=admin-refresh;`)),
        );
        expect(AUTH_ACCESS_TOKEN_COOKIE).not.toBe('keycloak');
        expect(AUTH_REFRESH_TOKEN_COOKIE).not.toBe('refreshToken');
        expect(cookiesOnPath(setCookies, '/')).toEqual([]);
    });

    it.each(['/admin/auth/set-token', '/admin/auth/clear-token'])(
        '%s expires the legacy Admin cookies on /admin but leaves the app session on / alone',
        async (url) => {
            const { setCookies } = await call('POST', url, { body: {} });

            expect(cookiesOnPath(setCookies, '/')).toEqual([]);
            expect(cookiesOnPath(setCookies, '/admin')).toEqual(
                expect.arrayContaining([
                    expect.stringMatching(/^keycloak=; expires=Thu, 01 Jan 1970/),
                    expect.stringMatching(/^refreshToken=; expires=Thu, 01 Jan 1970/),
                ]),
            );
        },
    );

    it('hands out the Admin session even when the browser also sends the app session', async () => {
        const { status, json } = await call('GET', '/admin/auth/session', {
            cookie: `${AUTH_ACCESS_TOKEN_COOKIE}=admin-access; ${AUTH_REFRESH_TOKEN_COOKIE}=admin-refresh; ${APP_COOKIES}`,
        });

        expect(status).toBe(200);
        expect(json).toEqual({ access_token: 'admin-access', refresh_token: 'admin-refresh' });
    });

    it('never treats the app session as an Admin session', async () => {
        const { status, setCookies } = await call('GET', '/admin/auth/session', { cookie: APP_COOKIES });

        expect(status).toBe(401);
        expect(cookiesOnPath(setCookies, '/')).toEqual([]);
    });

    it('does not answer 500 because some other cookie on the host is not URI-encoded', async () => {
        const { status, json } = await call('GET', '/admin/auth/session', {
            cookie: `broken=%E0%A4%A; ${AUTH_ACCESS_TOKEN_COOKIE}=admin-access; ${AUTH_REFRESH_TOKEN_COOKIE}=admin-refresh`,
        });

        expect(status).toBe(200);
        expect(json.access_token).toBe('admin-access');
    });

    it('skips an undecodable Admin cookie and uses the first valid duplicate', async () => {
        const { status, json } = await call('GET', '/admin/auth/session', {
            cookie: [
                `${AUTH_ACCESS_TOKEN_COOKIE}=%E0%A4%A`,
                `${AUTH_REFRESH_TOKEN_COOKIE}=%E0%A4%A`,
                `${AUTH_ACCESS_TOKEN_COOKIE}=admin-access`,
                `${AUTH_REFRESH_TOKEN_COOKIE}=admin-refresh`,
                `${AUTH_ACCESS_TOKEN_COOKIE}=later-access`,
                `${AUTH_REFRESH_TOKEN_COOKIE}=later-refresh`,
            ].join('; '),
        });

        expect(status).toBe(200);
        expect(json).toEqual({ access_token: 'admin-access', refresh_token: 'admin-refresh' });
    });

    // A root cookie path would send the Admin tokens along with every request of the app.
    it.each(['/', ''])(
        'keeps the Admin cookies on /admin even when the cookie path is configured as %j',
        async (path) => {
            const { setCookies } = await call('POST', '/admin/auth/set-token', {
                body: {
                    access_token: 'admin-access',
                    refresh_token: 'admin-refresh',
                    expires_in: 60,
                    refresh_expires_in: 30,
                },
                config: { cookiePath: path },
            });

            expect(cookiesOnPath(setCookies, '/')).toEqual([]);
            expect(cookiesOnPath(setCookies, '/admin')).toEqual(
                expect.arrayContaining([
                    expect.stringMatching(new RegExp(`^${AUTH_ACCESS_TOKEN_COOKIE}=admin-access;`)),
                    expect.stringMatching(new RegExp(`^${AUTH_REFRESH_TOKEN_COOKIE}=admin-refresh;`)),
                ]),
            );
        },
    );
});

/**
 * ORISO-Helm#368: the BFF never invents a login host. Without an API or Keycloak URL it used to
 * post every Admin login to http://localhost; now it refuses to start and names the variable.
 */
describe('auth BFF login endpoint configuration', () => {
    const URL_KEYS = ['VITE_API_URL', 'REACT_APP_API_URL', 'VITE_KEYCLOAK_URL', 'REACT_APP_KEYCLOAK_URL'];
    const saved = {};

    beforeEach(() => {
        for (const key of URL_KEYS) {
            saved[key] = process.env[key];
            delete process.env[key];
        }
    });

    afterEach(() => {
        for (const key of URL_KEYS) {
            if (saved[key] === undefined) {
                delete process.env[key];
            } else {
                process.env[key] = saved[key];
            }
        }
    });

    it('throws and names the variables when neither API nor Keycloak URL is set', () => {
        expect(() => getAuthBffConfig()).toThrow(/VITE_API_URL/);
        expect(() => getAuthBffConfig()).toThrow(/VITE_KEYCLOAK_URL/);
    });

    it('refuses to create the handler without a login host', () => {
        expect(() => createAuthBffHandler()).toThrow(/VITE_API_URL/);
    });

    it('ignores a whitespace-only Keycloak URL and uses the API host', () => {
        process.env.VITE_API_URL = 'https://admin.example.org';
        process.env.VITE_KEYCLOAK_URL = '   ';
        expect(getAuthBffConfig().loginEndpoint).toMatch(/^https:\/\/admin\.example\.org\/auth\/realms\//);
    });

    it('treats whitespace-only values as missing', () => {
        process.env.VITE_API_URL = '  ';
        process.env.VITE_KEYCLOAK_URL = ' ';
        expect(() => getAuthBffConfig()).toThrow(/VITE_API_URL/);
    });

    it('treats an empty value as missing', () => {
        process.env.VITE_API_URL = '';
        expect(() => getAuthBffConfig()).toThrow(/VITE_API_URL/);
    });

    it('logs in against the API host when only VITE_API_URL is set', () => {
        process.env.VITE_API_URL = 'https://admin.example.org';
        expect(getAuthBffConfig().loginEndpoint).toMatch(
            /^https:\/\/admin\.example\.org\/auth\/realms\/[^/]+\/protocol\/openid-connect\/token$/,
        );
    });

    it('prefers the dedicated Keycloak host when set', () => {
        process.env.VITE_API_URL = 'https://admin.example.org';
        process.env.VITE_KEYCLOAK_URL = 'https://auth.example.org';
        expect(getAuthBffConfig().loginEndpoint).toMatch(/^https:\/\/auth\.example\.org\/realms\//);
    });
});
