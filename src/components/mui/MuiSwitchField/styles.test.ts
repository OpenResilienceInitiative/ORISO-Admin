import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vite-plus/test';
import { contrastRatio } from '../../../utils/contrastRatio';

/*
 * ORISO-Admin#1374: an unchecked switch was a white knob on a transparent track
 * with a 1px `outline-variant` border — on the near-white tile it did not read
 * as a switch, nor as "off". These assertions read the stylesheet as text (the
 * convention of CreateConsultantModal/styles.test.ts) so a regression to the
 * faint off state, or to the off-centre knob, fails loudly.
 */

const stylesheet = readFileSync(resolve(__dirname, './styles.module.scss'), 'utf8');

/** Body of the LAST rule for `selector`: nested state rules come first, the base rule last. */
const ruleBody = (selector: string) =>
    [...stylesheet.matchAll(new RegExp(`${selector}\\s*{([^}]*)`, 'g'))].at(-1)?.[1] ?? '';

const OUTLINE = '#747878';
const TILE_SURFACE = '#ffffff';
const OFF_TRACK = '#e4e2e2';
const OFF_KNOB = '#444748';

describe('MuiSwitch off state (#1374)', () => {
    it('draws the unchecked track as a tonal fill with a 2px outline border', () => {
        const track = ruleBody(':global\\(\\.MuiSwitch-track\\)');

        expect(track).toMatch(/border:\s*2px solid var\(--m3-outline, #747878\);/);
        expect(track).toMatch(/background-color:\s*var\(--m3-surface-container-highest, #e4e2e2\);/);
        expect(track).not.toMatch(/transparent/);
    });

    it('uses a dark knob for the off state', () => {
        expect(ruleBody('\\.thumbOff')).toMatch(/background-color:\s*var\(--m3-on-surface-variant, #444748\);/);
    });

    it('keeps the outline at least 3:1 against the tile surface (WCAG 1.4.11)', () => {
        expect(contrastRatio(OUTLINE, TILE_SURFACE)).toBeGreaterThanOrEqual(3);
        expect(contrastRatio(OFF_KNOB, OFF_TRACK)).toBeGreaterThanOrEqual(3);
        // The ✕ glyph is drawn in the track colour on the dark knob.
        expect(contrastRatio(OFF_TRACK, OFF_KNOB)).toBeGreaterThanOrEqual(4.5);
    });

    it('centres the 24px knob in the 32px track (4px inset on every side)', () => {
        expect(stylesheet).toMatch(/height:\s*32px;/);
        expect(ruleBody(':global\\(\\.MuiSwitch-switchBase\\)')).toMatch(/margin:\s*4px;/);
        expect(ruleBody('\\.thumb')).toMatch(/height:\s*24px;/);
    });
});
