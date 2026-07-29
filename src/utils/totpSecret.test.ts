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

    it('yields an empty string for a missing secret', () => {
        expect(toBase32Secret(null)).toBe('');
        expect(toBase32Secret(undefined)).toBe('');
        expect(toBase32Secret('')).toBe('');
    });
});
