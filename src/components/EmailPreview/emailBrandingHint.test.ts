import { describe, expect, it } from 'vitest';
import { resolveEmailLogoFallbackReason, resolveEmailLogoUrl } from './emailBrandingHint';

const origin = 'https://predev.oriso.org';
const uploaded = 'data:image/png;base64,iVBORw0KGgo=';

describe('email logo eligibility', () => {
    it('uses the effective returned tenant id for uploaded images', () => {
        expect(resolveEmailLogoUrl({ logo: uploaded }, 1, origin)).toBe(
            `${origin}/service/tenant/public/branding/1/logo`,
        );
        expect(resolveEmailLogoFallbackReason({ logo: uploaded }, 1, origin)).toBeNull();
    });

    it.each([undefined, null, -1, NaN])('does not invent an asset tenant for %s', (id) => {
        expect(resolveEmailLogoUrl({ logo: uploaded }, id, origin)).toBeNull();
    });

    it.each(['data:image/jpeg;base64,/9j/AA==', 'iVBORw0KGgo='])('accepts stored image candidate %s', (logo) => {
        expect(resolveEmailLogoUrl({ logo }, 40, origin)).toContain('/branding/40/logo');
    });

    it('accepts a same-origin URL and association-logo fallback', () => {
        expect(resolveEmailLogoUrl({ associationLogo: `${origin}/logo.png` }, 1, origin)).toBe(`${origin}/logo.png`);
    });

    it.each([
        'https://external.example/logo.png',
        'http://predev.oriso.org/logo.png',
        'https://',
        'https:///logo.png',
        'https://user:password@predev.oriso.org/logo.png',
        'https://predev.oriso.org/my logo.png',
        'https://predev.oriso.org/logo.png?token=secret',
        'https://predev.oriso.org/logo.png#secret',
        'data:image/svg+xml;base64,AAAA',
        '/relative/logo.png',
    ])('rejects an unsafe or unsupported candidate %s', (logo) => {
        expect(resolveEmailLogoFallbackReason({ logo }, 1, origin)).toBe('LOGO_NOT_REMOTE');
    });

    it('distinguishes absent data from an unsupported logo', () => {
        expect(resolveEmailLogoFallbackReason({}, 1, origin)).toBe('NO_LOGO');
        expect(resolveEmailLogoFallbackReason(null, 1, origin)).toBe('NO_LOGO');
    });
});
