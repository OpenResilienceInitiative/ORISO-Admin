import { describe, it, expect } from 'vitest';
import { isValidSubdomain, SUBDOMAIN_PATTERN } from './isValidSubdomain';

describe('isValidSubdomain', () => {
    it.each(['caritas', 'caritas-online', 'a', 'tenant1', 'a1b2-c3', '123', 'x-y-z'])(
        'accepts valid subdomain "%s"',
        (value) => {
            expect(isValidSubdomain(value)).toBe(true);
        },
    );

    // emptiness is handled by the separate `required` rule, so it counts as valid here
    it.each([
        ['empty string', ''],
        ['undefined', undefined],
        ['null', null],
    ])('treats %s as valid', (_label, value) => {
        expect(isValidSubdomain(value as string | null | undefined)).toBe(true);
    });

    it.each([
        ['uppercase', 'Caritas'],
        ['leading hyphen', '-caritas'],
        ['trailing hyphen', 'caritas-'],
        ['space', 'cari tas'],
        ['underscore', 'cari_tas'],
        ['dot', 'cari.tas'],
        ['non-ascii', 'cäritas'],
        ['accent', 'café'],
    ])('rejects invalid subdomain (%s)', (_label, value) => {
        expect(isValidSubdomain(value)).toBe(false);
    });

    it('exports the same pattern the form rule uses', () => {
        expect(SUBDOMAIN_PATTERN.test('caritas-online')).toBe(true);
        expect(SUBDOMAIN_PATTERN.test('-bad-')).toBe(false);
    });
});
