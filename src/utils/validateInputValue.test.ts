import { describe, expect, it } from 'vite-plus/test';
import { validatePasswordCriteria } from './validateInputValue';

const SIXTEEN = 'Abcdefghij12345!';
const FIFTEEN = 'Abcdefghij1234!';

describe('validatePasswordCriteria', () => {
    it('accepts a password meeting all four criteria at 16 characters', () => {
        expect(SIXTEEN).toHaveLength(16);
        expect(validatePasswordCriteria(SIXTEEN)).toBe(true);
    });

    it('requires at least 16 characters (15 fails, 16 passes)', () => {
        expect(FIFTEEN).toHaveLength(15);
        expect(validatePasswordCriteria(FIFTEEN)).toBe(false);
        expect(validatePasswordCriteria('Abcde123!')).toBe(false); // the old 9-character rule
    });

    it('rejects when the digit is missing', () => {
        expect(validatePasswordCriteria('Abcdefghijklmnop!')).toBe(false);
    });

    it('rejects when the special character is missing', () => {
        expect(validatePasswordCriteria('Abcdefghijkl12345')).toBe(false);
    });

    it('rejects when not mixed-case', () => {
        expect(validatePasswordCriteria('abcdefghij12345!')).toBe(false); // no uppercase
        expect(validatePasswordCriteria('ABCDEFGHIJ12345!')).toBe(false); // no lowercase
    });

    it('counts German umlauts as letters for the mixed-case rule', () => {
        expect(validatePasswordCriteria('Äbcdefghij12345!')).toBe(true);
    });

    it('treats whitespace as a special character', () => {
        expect(validatePasswordCriteria('Abcdefghijkl123  ')).toBe(true);
    });
});
