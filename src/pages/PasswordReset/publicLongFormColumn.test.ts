import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const loginForm = readFileSync(resolve(__dirname, '../../styles/components/loginForm.less'), 'utf8');

const lessPx = (name: string): number => {
    const raw = loginForm.match(new RegExp(`${name}:\\s*(\\d+)px`))?.[1];
    return raw ? Number(raw) : 0;
};

/**
 * The language selector is `position: fixed` in the top-right corner of EVERY
 * public page, with a transparent background and z-index 25 — content scrolls
 * *underneath* it. The 320px sign-in column never reached that corner, so the
 * overlap only became possible when #594.3 gave long forms a 640px reading
 * measure: at 1366–1600 the reader card ran 10–80px into the control, the DPA
 * text and its chapter chips rendered through "(EN) English", and because the
 * fixed control is topmost it also swallowed clicks over that strip.
 *
 * jsdom computes no layout, so the invariant is asserted on the stylesheet the
 * same way #569's scroll container is (see components/Layout/publicPageScroll):
 * the long-form row reserves the selector's footprint, therefore the column can
 * never reach it at any viewport width.
 */
describe('public long-form reading column vs. the fixed language selector', () => {
    // Measured in the browser at 1440x900: the control renders 145px wide for
    // the longest label ("(EN) English") and sits @spacing-ml (25px) from the
    // right edge from xl up, @spacing-sm (15px) below it.
    const SELECTOR_WIDTH = 145;
    const SELECTOR_INSET_XL = 25;

    const safeArea = lessPx('@public-selector-safe-area');

    it('reserves at least the selector footprint plus a visible gap', () => {
        expect(safeArea).toBeGreaterThanOrEqual(SELECTOR_WIDTH + SELECTOR_INSET_XL);
    });

    it('applies the reserve to the long-form row, not to the sign-in column', () => {
        const longFormRow =
            loginForm.match(/\.publicContent\.publicLongForm > \.ant-row \{([\s\S]*?)\n {4}\}/)?.[1] ?? '';

        expect(longFormRow).toMatch(/padding-inline:\s*@public-selector-safe-area/);
    });

    it('drops only the left half of the reserve at xl, where the stage already owns the left 40vw', () => {
        const xlBlock = loginForm.split(`@media screen and (min-width: @screen-xl)`).pop() ?? '';

        expect(xlBlock).toMatch(/\.publicContent\.publicLongForm > \.ant-row \{[\s\S]*padding-inline-start:\s*0/);
    });

    /**
     * The reported regression, as geometry: from xl up the row is the right
     * 60vw, the column is centred inside it and capped at 640px. Its right
     * edge must stay left of the selector at every width the reviewer measured.
     */
    it.each([1200, 1366, 1440, 1512, 1600, 1920])('keeps the column clear of the selector at %ipx', (viewport) => {
        const rowRight = viewport;
        const rowContentWidth = viewport * 0.6 - safeArea;
        const columnWidth = Math.min(640, rowContentWidth);
        const columnRight = rowRight - safeArea - (rowContentWidth - columnWidth) / 2;
        const selectorLeft = viewport - SELECTOR_INSET_XL - SELECTOR_WIDTH;

        expect(columnRight).toBeLessThan(selectorLeft);
        // ...and the reading measure stays worth having.
        expect(columnWidth).toBeGreaterThanOrEqual(480);
    });
});
