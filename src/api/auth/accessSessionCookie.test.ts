import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../config/runtimeConfig', () => ({
    runtimeConfig: { cookieDomain: '', cookieSecure: true, cookiesAllowedList: ['devProxy'] },
}));

// eslint-disable-next-line import/first
import { removeAllCookies } from './accessSessionCookie';

const setCookie = (cookie: string) => {
    document.cookie = `${cookie}; path=/`;
};

describe('removeAllCookies', () => {
    afterEach(() => {
        document.cookie.split(';').forEach((entry) => {
            const name = entry.trim().split('=')[0];
            if (name) document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
        });
    });

    // The counselling app on the same host keeps its session in these readable cookies on
    // Path=/. An Admin logout that deleted them logged the person out of the app as well.
    it('does not end the counselling app session', () => {
        setCookie('keycloak=app-access');
        setCookie('refreshToken=app-refresh');

        removeAllCookies();

        expect(document.cookie).toContain('keycloak=app-access');
        expect(document.cookie).toContain('refreshToken=app-refresh');
    });

    it('still removes the other readable cookies but keeps the allowlist', () => {
        setCookie('CSRF-TOKEN=abc');
        setCookie('devProxy=1');

        removeAllCookies();

        expect(document.cookie).not.toContain('CSRF-TOKEN');
        expect(document.cookie).toContain('devProxy=1');
    });
});
