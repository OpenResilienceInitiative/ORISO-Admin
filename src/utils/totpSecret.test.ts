import { toBase32Secret } from './totpSecret';

describe('toBase32Secret', () => {
    it('encodes the raw secret so an authenticator derives the same HMAC key', () => {
        expect(toBase32Secret('ORISOSECRET234567ABCDEFGHIJKLMNO')).toBe(
            'J5JESU2PKNCUGUSFKQZDGNBVGY3UCQSDIRCUMR2IJFFEWTCNJZHQ',
        );
    });

    it('drops the padding an authenticator will not accept', () => {
        expect(toBase32Secret('abc')).toBe('MFRGG');
        expect(toBase32Secret('a')).toBe('ME');
    });

    it('drops padding regardless of how many bytes are left over in the final block', () => {
        // Base32 pads 1/2/3/4 leftover bytes with 6/4/3/1 '=' respectively —
        // every one of those trailing runs has to be stripped, not just the
        // single-'=' and 6-'=' cases already covered above.
        expect(toBase32Secret('ab')).toBe('MFRA');
        expect(toBase32Secret('abcd')).toBe('MFRGGZA');
    });

    it('leaves an already-unpadded encoding (byte length a multiple of 5) untouched', () => {
        const result = toBase32Secret('abcde');
        expect(result).toBe('MFRGGZDF');
        expect(result.endsWith('=')).toBe(false);
    });

    it('produces only characters from the RFC 4648 base32 alphabet', () => {
        expect(toBase32Secret('ORISOSECRET234567ABCDEFGHIJKLMNO')).toMatch(/^[A-Z2-7]+$/);
    });

    it('yields an empty string for a missing secret', () => {
        expect(toBase32Secret(null)).toBe('');
        expect(toBase32Secret(undefined)).toBe('');
        expect(toBase32Secret('')).toBe('');
    });
});
