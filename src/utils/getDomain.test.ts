import { afterEach, describe, expect, it } from 'vitest';
import { getDomain } from './getDomain';

const originalLocation = window.location;

const setHost = (host: string) => {
    Object.defineProperty(window, 'location', {
        configurable: true,
        value: { ...originalLocation, host },
    });
};

afterEach(() => {
    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
});

describe('getDomain', () => {
    it('strips the subdomain from a 3-part host', () => {
        setHost('tenant1.oriso.org');
        expect(getDomain()).toBe('oriso.org');
    });

    it('prepends a provided subdomain to the base domain', () => {
        setHost('tenant1.oriso.org');
        expect(getDomain('admin')).toBe('admin.oriso.org');
    });

    it('keeps a 2-part host unchanged (no subdomain to strip)', () => {
        setHost('oriso.org');
        expect(getDomain()).toBe('oriso.org');
        expect(getDomain('admin')).toBe('admin.oriso.org');
    });

    it('keeps a host without a dot unchanged', () => {
        setHost('localhost:9000');
        expect(getDomain()).toBe('localhost:9000');
    });
});
