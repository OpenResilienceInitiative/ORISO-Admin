import { describe, expect, it } from 'vite-plus/test';
import { contrastLevel, formatContrastRatio, normalizeHexColor, rateColorContrast } from './colorContrastRating';
import { DARK_TEXT } from './theme/orisoScheme';

describe('normalizeHexColor', () => {
    it('accepts 3- and 6-digit hex with or without the hash', () => {
        expect(normalizeHexColor('#A5000A')).toBe('#a5000a');
        expect(normalizeHexColor('a5000a')).toBe('#a5000a');
        expect(normalizeHexColor('#abc')).toBe('#aabbcc');
        expect(normalizeHexColor(' #abc ')).toBe('#aabbcc');
    });

    it('rejects anything that is not a hex colour', () => {
        expect(normalizeHexColor(undefined)).toBeUndefined();
        expect(normalizeHexColor('')).toBeUndefined();
        expect(normalizeHexColor('#abcd')).toBeUndefined();
        expect(normalizeHexColor('red')).toBeUndefined();
        expect(normalizeHexColor('#ggg000')).toBeUndefined();
    });
});

describe('contrastLevel', () => {
    it('maps WCAG thresholds: ≥7 AAA, ≥4.5 AA, below that fail', () => {
        expect(contrastLevel(21)).toBe('AAA');
        expect(contrastLevel(7)).toBe('AAA');
        expect(contrastLevel(6.99)).toBe('AA');
        expect(contrastLevel(4.5)).toBe('AA');
        expect(contrastLevel(4.49)).toBe('fail');
        expect(contrastLevel(1)).toBe('fail');
    });
});

describe('rateColorContrast', () => {
    it('rates the ORISO brand red against white text as AAA', () => {
        const rating = rateColorContrast('#A5000A');

        expect(rating).toMatchObject({ color: '#a5000a', textColor: '#ffffff', whiteText: true, level: 'AAA' });
        expect(rating!.ratio).toBeGreaterThan(7);
    });

    it('rates a light colour against the theme’s dark text, not white', () => {
        const rating = rateColorContrast('#ffe2de');

        expect(rating).toMatchObject({ textColor: DARK_TEXT, whiteText: false, level: 'AAA' });
    });

    it('flags a mid-tone where neither white nor dark text reaches 4.5:1', () => {
        // #808080: white gives ~3.9:1, the theme's dark text ~4.4:1 — neither reaches 4.5.
        const rating = rateColorContrast('#808080');

        expect(rating!.ratio).toBeLessThan(4.5);
        expect(rating!.level).toBe('fail');
    });

    it('lands in AA between 4.5 and 7', () => {
        const rating = rateColorContrast('#d32f2f');

        expect(rating!.ratio).toBeGreaterThanOrEqual(4.5);
        expect(rating!.ratio).toBeLessThan(7);
        expect(rating!.level).toBe('AA');
    });

    it('returns undefined for missing or invalid colours', () => {
        expect(rateColorContrast(undefined)).toBeUndefined();
        expect(rateColorContrast('not-a-colour')).toBeUndefined();
    });
});

describe('formatContrastRatio', () => {
    it('uses the locale decimal separator', () => {
        expect(formatContrastRatio(7.84, 'de')).toBe('7,8');
        expect(formatContrastRatio(7.84, 'en')).toBe('7.8');
        expect(formatContrastRatio(7.84, 'de@informal')).toBe('7,8');
    });

    it('rounds down so a failing ratio never displays as 4,5', () => {
        expect(formatContrastRatio(4.48, 'de')).toBe('4,4');
        expect(formatContrastRatio(21, 'de')).toBe('21,0');
    });
});
