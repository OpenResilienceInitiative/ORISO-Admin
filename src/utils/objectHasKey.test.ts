import { describe, expect, it } from 'vitest';
import objectHasKey from './objectHasKey';

describe('objectHasKey', () => {
    it('returns true for an own enumerable property', () => {
        expect(objectHasKey({ a: 1 }, 'a')).toBe(true);
        expect(objectHasKey({ a: undefined }, 'a')).toBe(true);
    });

    it('returns false for a missing property', () => {
        expect(objectHasKey({ a: 1 }, 'b')).toBe(false);
    });

    it('returns false for inherited (non-own) properties', () => {
        expect(objectHasKey({ a: 1 }, 'toString')).toBe(false);
        expect(objectHasKey({ a: 1 }, 'hasOwnProperty')).toBe(false);
    });

    it.each([null, undefined, 0, '', false])('returns false for falsy object %s', (value) => {
        expect(objectHasKey(value, 'a')).toBe(false);
    });

    it('works with array index keys', () => {
        expect(objectHasKey(['x'], '0')).toBe(true);
        expect(objectHasKey(['x'], '1')).toBe(false);
    });
});
