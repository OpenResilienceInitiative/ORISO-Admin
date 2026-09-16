import { Readable } from 'node:stream';
import { describe, expect, it } from 'vitest';
import {
    AUTH_ACCESS_TOKEN_COOKIE,
    AUTH_REFRESH_TOKEN_COOKIE,
    buildAuthCookieAttributes,
    createAuthBffHandler,
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
 * The Admin runs on the same host as the counselling app (dev.oriso.org/admin next to
 * dev.oriso.org/app). The app keeps its own session in the cookies `keycloak` and `refreshToken`
 * on Path=/, and the browser sends those to /admin as well. The BFF therefore must use cookie
 * names of its own and must never write to Path=/ — before this, the Admin picked up the app
 * user's token, and every Admin login or logout deleted the app session.
 */
describe('auth BFF on a host shared with the counselling app', () => {
    const APP_COOKIES = 'keycloak=app-access; refreshToken=app-refresh';

    const createHandler = () =>
        createAuthBffHandler({
            cookieDomain: '',
            cookiePath: '/admin',
            cookieSecure: true,
            hostnamesWithoutCookieDomain: [],
            loginEndpoint: 'http://keycloak.test/token',
            keycloakClientId: 'app',
        });

    const call = async (method, url, { cookie, body } = {}) => {
        const request = Readable.from(body ? [Buffer.from(JSON.stringify(body))] : []);
        Object.assign(request, { method, url, headers: { host: 'dev.oriso.org', ...(cookie ? { cookie } : {}) } });
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
        await createHandler()(request, response);
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
});
