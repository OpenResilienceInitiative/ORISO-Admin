import { describe, expect, it } from 'vitest';
import { brandSeedCannotYieldPalette } from './seedUsability';

describe('brandSeedCannotYieldPalette', () => {
    it('rejects a near-black seed (same Frontend tooPale guard)', () => {
        expect(brandSeedCannotYieldPalette('#000000')).toBe(true);
    });

    it('rejects a near-grey seed', () => {
        expect(brandSeedCannotYieldPalette('#7f7f7f')).toBe(true);
    });

    it('rejects a washed-out seed', () => {
        expect(brandSeedCannotYieldPalette('#eeeeee')).toBe(true);
    });

    it('accepts the Oriso brand red', () => {
        expect(brandSeedCannotYieldPalette('#A5000A')).toBe(false);
    });

    it('accepts a chromatic dark seed (guard is chroma, not tone)', () => {
        expect(brandSeedCannotYieldPalette('#4B0082')).toBe(false);
    });

    it('treats blank and absent values as unset, not unusable', () => {
        expect(brandSeedCannotYieldPalette(undefined)).toBe(false);
        expect(brandSeedCannotYieldPalette(null)).toBe(false);
        expect(brandSeedCannotYieldPalette('')).toBe(false);
        expect(brandSeedCannotYieldPalette('   ')).toBe(false);
    });

    it('rejects a non-empty invalid hex', () => {
        expect(brandSeedCannotYieldPalette('not-a-colour')).toBe(true);
    });
});
