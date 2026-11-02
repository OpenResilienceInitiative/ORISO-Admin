import { describe, expect, it } from 'vitest';
import { contrastRatio } from '../contrastRatio';
import { computeOrisoPalette } from './orisoScheme';

/**
 * ORISO-Admin#1322: the platform admin's brand seed sets the admin colours.
 * Whatever seed they pick, text and icons in the brand tone must stay readable
 * on the light brand container (selection pill, mobile menu tiles).
 */
const TEXT = 4.5;

describe('computeOrisoPalette — contrast on the light brand container', () => {
    it.each(['#ffe066', '#a8e6a1', '#9ec9ff', '#ff9f43', '#a5000a', '#004e8c'])(
        'keeps selected text and on-container accents readable for seed %s',
        (accentDark) => {
            const { tokens } = computeOrisoPalette({ accentDark });

            expect(
                contrastRatio(tokens['--admin-field-selected-text'], tokens['--admin-field-selected-surface']),
            ).toBeGreaterThanOrEqual(TEXT);
            expect(
                contrastRatio(tokens['--admin-accent-on-container'], tokens['--m3-primary-container']),
            ).toBeGreaterThanOrEqual(TEXT);
        },
    );

    it('keeps the brand tint instead of falling back to black', () => {
        const { tokens } = computeOrisoPalette({ accentDark: '#ffe066' });

        expect(tokens['--admin-accent-on-container']).not.toBe('#000000');
        expect(tokens['--admin-accent-on-container']).not.toBe('#1a1c1e');
    });

    it('leaves the default seed exactly as it was', () => {
        const { tokens } = computeOrisoPalette({ accentDark: '#a5000a' });

        expect(tokens['--admin-field-selected-text']).toBe('#930008');
        expect(tokens['--admin-accent-on-container']).toBe('#a5000a');
        expect(tokens['--m3-primary']).toBe('#a5000a');
    });
});
