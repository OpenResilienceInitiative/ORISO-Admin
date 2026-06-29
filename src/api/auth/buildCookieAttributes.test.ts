import { describe, expect, it } from 'vitest';
import { buildCookieAttributes } from './buildCookieAttributes';

describe('buildCookieAttributes', () => {
    it('always includes path and strict same-site attributes', () => {
        expect(buildCookieAttributes({ cookieSecure: false, cookieDomain: '' })).toBe('; path=/; SameSite=Strict');
    });

    it('adds secure, domain, and httpOnly attributes when configured', () => {
        expect(
            buildCookieAttributes({
                cookieSecure: true,
                cookieDomain: '.example.org',
                httpOnly: true,
            }),
        ).toBe('; path=/; SameSite=Strict; Secure; Domain=.example.org; HttpOnly');
    });
});
