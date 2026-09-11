import { describe, expect, it } from 'vitest';
import { resolveBrandingFavicon } from './resolveBrandingFavicon';

const TENANT_ICON = 'data:image/png;base64,dGVuYW50';
const PLATFORM_ICON = 'data:image/vnd.microsoft.icon;base64,cGxhdGZvcm0=';

describe('resolveBrandingFavicon', () => {
    it('prefers the tenant icon over the platform icon', () => {
        expect(resolveBrandingFavicon(TENANT_ICON, PLATFORM_ICON)).toBe(TENANT_ICON);
    });

    it('falls back to the platform icon when the tenant has none', () => {
        expect(resolveBrandingFavicon(undefined, PLATFORM_ICON)).toBe(PLATFORM_ICON);
    });

    it('falls back to the platform icon when the tenant icon is not a usable url', () => {
        expect(resolveBrandingFavicon('data:image/png;base64,dGVzdA&#61;&#61;', PLATFORM_ICON)).toBe(PLATFORM_ICON);
    });

    it('resolves to nothing when neither icon is usable, so the built-in stays', () => {
        expect(resolveBrandingFavicon(undefined, undefined)).toBeUndefined();
    });
});
