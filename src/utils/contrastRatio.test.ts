import { describe, expect, it } from 'vitest';
import { contrastRatio, relativeLuminance, toRgb } from './contrastRatio';

describe('contrastRatio', () => {
    it('matches the WCAG reference values', () => {
        expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
        expect(contrastRatio('#ffffff', '#ffffff')).toBeCloseTo(1, 5);
        // The canonical worked example from WCAG 2.2 SC 1.4.3.
        expect(contrastRatio('#777777', '#ffffff')).toBeCloseTo(4.48, 2);
    });

    it('does not depend on the order of the arguments', () => {
        expect(contrastRatio('#a5000a', '#ffffff')).toBeCloseTo(contrastRatio('#ffffff', '#a5000a'), 10);
    });

    it('reads three-digit hex, and with or without the hash', () => {
        expect(toRgb('#abc')).toEqual([170, 187, 204]);
        expect(toRgb('aabbcc')).toEqual([170, 187, 204]);
        expect(relativeLuminance('#fff')).toBeCloseTo(relativeLuminance('#ffffff'), 10);
    });

    it('is unaffected by the 0.03928 / 0.04045 threshold disagreement', () => {
        // WCAG 2.x prints 0.03928; the sRGB spec and the WCAG errata print
        // 0.04045. Both spellings existed in this repo. No 8-bit channel value
        // falls between them (10/255 = 0.0392, 11/255 = 0.0431), so the two are
        // the same function here — which is what makes one shared copy safe.
        const withThreshold = (limit: number) => (value: number) => {
            const c = value / 255;

            return c <= limit ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
        };
        const wcag = withThreshold(0.03928);
        const srgb = withThreshold(0.04045);

        for (let value = 0; value <= 255; value += 1) {
            expect(wcag(value)).toBe(srgb(value));
        }
    });

    it('gamma-decodes rather than weighting raw sRGB', () => {
        // The shortcut that skips toLinear reports ~0.7152 for pure green; the
        // correct value is far lower, which is what makes it fail against white.
        expect(relativeLuminance('#00ff00')).toBeCloseTo(0.7152, 4);
        expect(relativeLuminance('#00cc00')).toBeLessThan(0.45);
    });
});
