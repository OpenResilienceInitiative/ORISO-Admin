import { describe, expect, it } from 'vite-plus/test';
import { contrastRatio } from '../contrastRatio';
import { computeOrisoPalette, HIGH_CONTRAST_INK_TONES } from './orisoScheme';
import { toneOf } from './neutralTone';

const SEEDS = { accentDark: '#a5000a' };

describe('personal contrast "high" (ORISO-Frontend#2544 parity)', () => {
    it('moves on-surface to pure black in light and pure white in dark', () => {
        expect(computeOrisoPalette(SEEDS, 'light', 'high').tokens['--m3-on-surface']).toBe('#000000');
        expect(computeOrisoPalette(SEEDS, 'dark', 'high').tokens['--m3-on-surface']).toBe('#ffffff');
    });

    it('lets the legacy-literal texts follow high contrast in light too', () => {
        const high = computeOrisoPalette(SEEDS, 'light', 'high').tokens;
        expect(high['--admin-scheme-on-surface']).toBe('#000000');
        expect(high['--admin-scheme-on-surface-variant']).toBe(high['--m3-on-surface-variant']);
    });

    it.each(['light', 'dark'] as const)('moves every ink role in %s and keeps the surfaces', (scheme) => {
        const standard = computeOrisoPalette(SEEDS, scheme, 'standard').tokens;
        const high = computeOrisoPalette(SEEDS, scheme, 'high').tokens;
        const tones = HIGH_CONTRAST_INK_TONES[scheme];

        expect(high['--m3-on-surface-variant']).toBe(
            toneOf(standard['--m3-on-surface-variant'], tones.onSurfaceVariant),
        );
        expect(high['--m3-outline']).toBe(toneOf(standard['--m3-outline'], tones.outline));
        expect(high['--m3-outline-variant']).toBe(toneOf(standard['--m3-outline-variant'], tones.outlineVariant));
        ['--m3-surface', '--m3-surface-container', '--m3-surface-container-high', '--admin-form-card-surface'].forEach(
            (surface) => expect(high[surface]).toBe(standard[surface]),
        );
        // Every changed ink reads better than before on the card surface.
        const card = high['--admin-form-card-surface'] ?? high['--m3-surface-container-high'];
        ['--m3-on-surface', '--m3-on-surface-variant', '--m3-outline'].forEach((ink) =>
            expect(contrastRatio(high[ink], card)).toBeGreaterThan(contrastRatio(standard[ink], card)),
        );
    });
});
