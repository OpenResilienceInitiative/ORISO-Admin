import { describe, expect, it } from 'vitest';
import { decodeTenantAsset } from './decodeTenantAsset';

/**
 * Live evidence (dev, tenant `caritas-berlin`, 2026-07-31): the stored
 * `theming.logo` carried 3,284 × `&#43;`, the favicon 249 × `&#43;` plus one
 * `&#61;`. Every one of the three branding assets failed to decode in the
 * browser (`ERR_INVALID_URL`), which is why the sign-in stage showed no logo
 * and the tab kept the built-in favicon.
 */
describe('decodeTenantAsset', () => {
    it('turns a TenantService-encoded data URL back into a decodable one', () => {
        const stored = 'data:image/png;base64,iVBORw0KGgo&#43;abc&#43;def&#61;';

        expect(decodeTenantAsset(stored)).toBe('data:image/png;base64,iVBORw0KGgo+abc+def=');
    });

    it('leaves an already-clean value untouched', () => {
        const clean = 'data:image/png;base64,iVBORw0KGgo+abc/def=';

        expect(decodeTenantAsset(clean)).toBe(clean);
    });

    it('handles hex entities and plain http urls', () => {
        expect(decodeTenantAsset('data:image/png;base64,a&#x2B;b')).toBe('data:image/png;base64,a+b');
        expect(decodeTenantAsset('https://assets.example.test/logo.png?a=1&amp;b=2')).toBe(
            'https://assets.example.test/logo.png?a=1&b=2',
        );
    });

    it('is empty-safe so a tenant without branding stays without branding', () => {
        expect(decodeTenantAsset(undefined)).toBeUndefined();
        expect(decodeTenantAsset(null)).toBeUndefined();
        expect(decodeTenantAsset('')).toBeUndefined();
    });

    /** The decode must not route the value through markup parsing. */
    it('does not turn markup in the value into anything but text', () => {
        expect(decodeTenantAsset('data:image/png;base64,<img onerror=x>')).toBe(
            'data:image/png;base64,<img onerror=x>',
        );
    });
});
