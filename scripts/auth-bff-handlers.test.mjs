import { describe, expect, it } from 'vitest';
import { buildAuthCookieAttributes, getRequestAuthBffConfig } from './auth-bff-handlers.mjs';

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
