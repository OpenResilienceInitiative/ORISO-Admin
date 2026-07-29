import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const loginForm = readFileSync(resolve(__dirname, '../../styles/components/loginForm.less'), 'utf8');

const lessPx = (name: string): number => {
    const raw = loginForm.match(new RegExp(`${name}:\\s*(\\d+)px`))?.[1];
    return raw ? Number(raw) : 0;
};

/**
 * Centring of the public long-form column (#594.16 / #594.16a).
 *
 * The previous shape of this file pinned a 200px ONE-SIDED reserve, because a
 * fixed language selector sat in the top-right corner of the light column and
 * the reading column ran into it. Frank's diagnosis was that the reserve *is*
 * the bug: "du musst einfach das Sprachfeld ändern, dann hast du den nötigen
 * Spielraum rechts wie links". The selector moved into the stage footer menu
 * (#594.15b), so the column can now take an equal gutter on both sides.
 *
 * jsdom computes no layout, so the invariant is asserted on the stylesheet the
 * same way #569's scroll container is: the row centres its column and pads both
 * sides identically, therefore the left and right spacing are equal by
 * construction at every viewport — on the tall DPA step exactly as on the short
 * ones, since none of it depends on the content height.
 */
describe('public long-form reading column — equal side spacing', () => {
    const mdBlock = loginForm.match(/\.publicContent\.publicLongForm > \.ant-row \{([\s\S]*?)\n {4}\}/)?.[1] ?? '';
    const xlBlock = loginForm.split('@media screen and (min-width: @screen-xl)').pop() ?? '';

    it('has dropped the one-sided language-selector reserve', () => {
        expect(loginForm).not.toMatch(/@public-selector-safe-area/);
        expect(loginForm).not.toMatch(/\.loginLanguageSelector\s*\{/);
    });

    it('centres the column inside its row', () => {
        expect(mdBlock).toMatch(/justify-content:\s*center/);
    });

    it('pads both sides of the row with the same gutter', () => {
        expect(mdBlock).toMatch(/padding-inline:\s*@public-form-gutter/);
        expect(mdBlock).not.toMatch(/padding-inline-(start|end)/);
        expect(lessPx('@public-form-gutter')).toBeGreaterThan(0);
    });

    it('never re-introduces an asymmetric gutter at the desktop breakpoint', () => {
        expect(xlBlock).not.toMatch(/padding-inline-(start|end)/);
    });

    /**
     * The geometry the reviewer measures: from xl up the row is the right 60vw
     * (the stage owns the left 40vw), the column is capped at 640px and centred
     * inside it. Left and right spacing must come out identical — and the
     * reading measure must stay worth having.
     */
    it.each([1200, 1366, 1440, 1512, 1600, 1920])('splits the free width evenly at %ipx', (viewport) => {
        const gutter = lessPx('@public-form-gutter');
        const rowWidth = viewport * 0.6;
        const contentWidth = rowWidth - 2 * gutter;
        const columnWidth = Math.min(640, contentWidth);
        const freeSpace = contentWidth - columnWidth;

        const spaceLeft = gutter + freeSpace / 2;
        const spaceRight = gutter + freeSpace / 2;

        expect(spaceLeft).toBe(spaceRight);
        expect(columnWidth).toBeGreaterThanOrEqual(480);
    });
});
