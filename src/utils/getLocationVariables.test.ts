import { afterEach, describe, expect, it } from 'vitest';
import getLocationVariables from './getLocationVariables';

const originalLocation = window.location;

const setLocation = (host: string, protocol = 'https:') => {
    Object.defineProperty(window, 'location', {
        configurable: true,
        value: { ...originalLocation, host, protocol, origin: `${protocol}//${host}` },
    });
};

afterEach(() => {
    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
});

describe('getLocationVariables', () => {
    it('extracts the first label as subdomain for a 3-part host', () => {
        setLocation('tenant1.oriso.org');
        expect(getLocationVariables()).toMatchObject({ subdomain: 'tenant1', host: 'tenant1.oriso.org' });
    });

    it('returns an empty subdomain for a 2-part host', () => {
        setLocation('oriso.org');
        expect(getLocationVariables().subdomain).toBe('');
    });

    it('uses "localhost" as subdomain on localhost', () => {
        setLocation('localhost:9000', 'http:');
        expect(getLocationVariables().subdomain).toBe('localhost');
    });

    it('handles a 4-part host (e.g. co.uk) by taking the first label', () => {
        setLocation('admin.tenant.co.uk');
        expect(getLocationVariables().subdomain).toBe('admin');
    });

    it('passes through protocol and origin', () => {
        setLocation('tenant1.oriso.org', 'https:');
        expect(getLocationVariables()).toMatchObject({
            protocol: 'https:',
            origin: 'https://tenant1.oriso.org',
        });
    });
});
