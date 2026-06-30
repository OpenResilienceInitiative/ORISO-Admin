import { describe, expect, it } from 'vitest';
import { isStringValidEmail } from './validateEmailString';

describe('isStringValidEmail', () => {
    it.each([
        'simple@example.com',
        'very.common@example.com',
        'x@example.com',
        'user.name+tag@sub.domain.co.uk',
        'first.last@iana.org',
        '"quoted local"@example.com',
        'user@[192.168.0.1]',
    ])('accepts valid address %s', (email) => {
        expect(isStringValidEmail(email)).toBe(true);
    });

    it.each([
        ['empty string', ''],
        ['no @', 'plainaddress'],
        ['no domain', 'user@'],
        ['no local part', '@example.com'],
        ['no TLD', 'user@example'],
        ['single-char TLD', 'user@example.c'],
        ['leading space', ' user@example.com'],
        ['trailing space', 'user@example.com '],
        ['space in middle', 'us er@example.com'],
        ['two @', 'user@@example.com'],
    ])('rejects %s', (_label, email) => {
        expect(isStringValidEmail(email)).toBe(false);
    });
});
