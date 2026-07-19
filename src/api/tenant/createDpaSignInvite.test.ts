import { describe, expect, it } from 'vitest';
import { resolveDpaSignLink } from './createDpaSignInvite';

describe('resolveDpaSignLink', () => {
    it('resolves a relative sign path against the configured App origin', () => {
        expect(resolveDpaSignLink('/dpa-sign/token-value', 'https://app.oriso-dev.site')).toBe(
            'https://app.oriso-dev.site/dpa-sign/token-value',
        );
    });

    it('keeps an absolute sign URL on its own origin', () => {
        expect(resolveDpaSignLink('https://sign.example.org/dpa-sign/token-value', 'https://app.oriso-dev.site')).toBe(
            'https://sign.example.org/dpa-sign/token-value',
        );
    });
});
