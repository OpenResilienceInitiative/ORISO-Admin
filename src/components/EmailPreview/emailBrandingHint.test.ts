import { describe, expect, it } from 'vitest';
import { isRemoteLogoUrl, resolveEmailLogoFallbackReason } from './emailBrandingHint';

describe('isRemoteLogoUrl', () => {
    it.each([
        ['https://cdn.example.org/logo.png', true],
        ['http://cdn.example.org/logo.png', true],
        ['  https://cdn.example.org/logo.png  ', true],
        ['data:image/png;base64,iVBORw0KGgo=', false],
        ['/admin/images/logo.png', false],
        ['https://cdn.example.org/my logo.png', false],
        ['https://cdn.example.org/"logo".png', false],
        ['', false],
        [null, false],
    ])('%s -> %s', (value, expected) => {
        expect(isRemoteLogoUrl(value as string | null)).toBe(expected);
    });
});

describe('resolveEmailLogoFallbackReason', () => {
    it('reports no fallback when the tenant logo is a remote URL', () => {
        expect(resolveEmailLogoFallbackReason({ logo: 'https://cdn.example.org/logo.png' })).toBeNull();
    });

    it('accepts the association logo as the second candidate, like the backend resolver', () => {
        expect(
            resolveEmailLogoFallbackReason({ logo: '', associationLogo: 'https://cdn.example.org/assoc.png' }),
        ).toBeNull();
    });

    it('flags a base64 logo separately — it exists but e-mail clients cannot show it', () => {
        expect(resolveEmailLogoFallbackReason({ logo: 'data:image/png;base64,iVBORw0KGgo=' })).toBe('LOGO_NOT_REMOTE');
    });

    it('flags a missing logo', () => {
        expect(resolveEmailLogoFallbackReason({})).toBe('NO_LOGO');
        expect(resolveEmailLogoFallbackReason(null)).toBe('NO_LOGO');
        expect(resolveEmailLogoFallbackReason({ logo: '   ' })).toBe('NO_LOGO');
    });
});
