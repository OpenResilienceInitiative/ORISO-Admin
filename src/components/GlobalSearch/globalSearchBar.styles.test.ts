import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const barStyles = readFileSync(resolve(__dirname, './globalSearchBar.module.scss'), 'utf8');
const composerStyles = readFileSync(resolve(__dirname, '../../pages/Links/inviteComposer.module.scss'), 'utf8');

const rule = (source: string, selector: string) =>
    source.match(new RegExp(`\\${selector}\\s*{([^}]*)}`, 's'))?.[1] ?? '';

/*
 * ORISO-Admin#713 asked this row to WRAP, because at a 1600px viewport it
 * demanded 1781px of content in 1336px of space and the send button sat at
 * x=1718 — "unreachable". Finding A1 reverses that: „Müssen wieder horizontal
 * scroll row werden."
 *
 * The two are not in conflict, and the reversal is deliberate rather than a
 * regression. `unreachable` was the load-bearing claim, and it does not hold:
 * `.scroller`, the row's direct parent, is a real scrollport (`overflow-x:
 * auto`). Measured in Storybook with Playwright on the restored `max-content`
 * row, at both ends of the range:
 *
 *   1440px viewport — scrollWidth 1781 vs clientWidth 1440 (the same 1781 #713
 *                     measured); scrollLeft moves to 341; the send button ends
 *                     up at left=1197, right=1440 — fully visible.
 *   390px viewport  — scrollWidth 1781 vs clientWidth 390; scrollLeft moves to
 *                     1391; the send button at left=147, right=390 — visible.
 *
 * So the row overflows AND scrolls, and the primary action is reachable at both
 * ends. #713's mistake was treating "overflows" as "is lost"; the fix it needed
 * was a working scrollport, which is what it already had.
 *
 * The contract is therefore inverted on purpose: the row keeps its controls on
 * ONE line and the scrollport carries the overflow. If this ever regresses to
 * wrapping, that is a design decision being reversed again, not a bug fix — say
 * so in the commit, as this comment does.
 */
describe('GlobalSearchBar row overflow contract (#713, reversed by A1)', () => {
    it('keeps the toolbar on one horizontally scrolling line', () => {
        const row = rule(barStyles, '.row');
        expect(row).toMatch(/flex-wrap:\s*nowrap;/);
        expect(row).toMatch(/width:\s*max-content;/);
    });

    it('still fills the bar when the controls happen to fit', () => {
        // Without this the row would collapse to its content and leave a gap on
        // a wide screen, which looks like a broken layout rather than a short one.
        expect(rule(barStyles, '.row')).toMatch(/min-width:\s*100%;/);
    });

    it('keeps the overflow on a real scrollport, not clipped', () => {
        // The whole reversal rests on this: the row may exceed its container
        // only because the parent actually scrolls.
        expect(rule(barStyles, '.scroller')).toMatch(/overflow-x:\s*auto;/);
    });

    it('keeps the pill (bottom-bar) variant on a single line', () => {
        // The bottom bar is one control plus a 48px overflow slot — wrapping it
        // would push the "Mehr" button onto a second line inside a fixed-height bar.
        expect(rule(barStyles, '.pillRow')).toMatch(/flex-wrap:\s*nowrap;/);
    });

    /*
     * A2 — „Muss eine höhe sein", with a line drawn across the whole toolbar.
     * Measured at 1440px before the fix: the search pill, both name fields and
     * both split buttons were 56px, the "⋮" more-button was 48px, and the
     * Träger-ID group was 76px because M3NumberField always renders a
     * supporting-text line under its 56px field box. Centring three different
     * total heights put their field boxes on three different baselines.
     */
    it('aligns the toolbar controls on one baseline instead of centring three heights', () => {
        expect(rule(barStyles, '.row')).toMatch(/align-items:\s*flex-start;/);
    });

    it('puts the more-button in the same 56px control band as its neighbours', () => {
        expect(rule(composerStyles, '.moreButton')).toMatch(/height:\s*56px;/);
    });

    it('lets the composer fields shrink below their nominal width', () => {
        // 304px + 2x210px of unshrinkable fields is wider than a 390px phone.
        ['.emailField', '.nameField'].forEach((selector) => {
            const field = rule(composerStyles, selector);
            expect(field).toMatch(/max-width:\s*100%;/);
            expect(field).not.toMatch(/flex:\s*0 0 auto;/);
        });
    });
});
