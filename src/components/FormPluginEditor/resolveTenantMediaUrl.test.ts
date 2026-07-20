import { describe, expect, it, vi } from 'vitest';

vi.mock('../../appConfig', () => ({ tenantServiceURL: 'https://api.oriso-dev.site' }));

import { resolveTenantMediaUrl } from './resolveTenantMediaUrl';

const ORIGIN = 'https://api.oriso-dev.site';

describe('resolveTenantMediaUrl (admin)', () => {
    it('prefixes a root-relative /media path with the tenant origin', () => {
        expect(resolveTenantMediaUrl('/media/abc-1', ORIGIN)).toBe('https://api.oriso-dev.site/media/abc-1');
    });
    it('collapses a trailing slash on the origin', () => {
        expect(resolveTenantMediaUrl('/media/x', 'https://api.test/')).toBe('https://api.test/media/x');
    });
    it('leaves the path relative when origin is empty (dev proxy)', () => {
        expect(resolveTenantMediaUrl('/media/x', '')).toBe('/media/x');
    });
    it('never touches absolute, data, blob or non-media sources', () => {
        expect(resolveTenantMediaUrl('https://cdn/x.png', ORIGIN)).toBe('https://cdn/x.png');
        expect(resolveTenantMediaUrl('data:image/png;base64,AA', ORIGIN)).toBe('data:image/png;base64,AA');
        expect(resolveTenantMediaUrl('/static/logo.png', ORIGIN)).toBe('/static/logo.png');
        expect(resolveTenantMediaUrl('/x/media/y', ORIGIN)).toBe('/x/media/y');
    });
    it('is safe on undefined', () => {
        expect(resolveTenantMediaUrl(undefined, ORIGIN)).toBeUndefined();
    });
});
