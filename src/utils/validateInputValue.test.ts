import { describe, expect, it } from 'vitest';
import { validatePasswordCriteria } from './validateInputValue';

describe('validatePasswordCriteria', () => {
    it('accepts a password meeting all four criteria', () => {
        // mixed case + digit + special + length > 8
        expect(validatePasswordCriteria('Abcdef12!')).toBe(true);
    });

    it('requires length strictly greater than 8 (8 chars fails)', () => {
        expect(validatePasswordCriteria('Abcde12!')).toBe(false); // exactly 8
        expect(validatePasswordCriteria('Abcde123!')).toBe(true); // 9
    });

    it('rejects when the digit is missing', () => {
        expect(validatePasswordCriteria('Abcdefgh!')).toBe(false);
    });

    it('rejects when the special character is missing', () => {
        expect(validatePasswordCriteria('Abcdefg12')).toBe(false);
    });

    it('rejects when not mixed-case', () => {
        expect(validatePasswordCriteria('abcdef12!')).toBe(false); // no uppercase
        expect(validatePasswordCriteria('ABCDEF12!')).toBe(false); // no lowercase
    });

    it('counts German umlauts as letters for the mixed-case rule', () => {
        expect(validatePasswordCriteria('Äbcdef12!')).toBe(true);
    });

    it('treats whitespace as a special character', () => {
        expect(validatePasswordCriteria('Abcdef1  ')).toBe(true);
    });
});
