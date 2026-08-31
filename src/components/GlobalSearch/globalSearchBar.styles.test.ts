import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const barStyles = readFileSync(resolve(__dirname, './globalSearchBar.module.scss'), 'utf8');
const composerStyles = readFileSync(resolve(__dirname, '../../pages/Links/inviteComposer.module.scss'), 'utf8');
const fieldStyles = readFileSync(resolve(__dirname, '../FloatingLabelInput/floatingLabelInput.module.scss'), 'utf8');
const appTokens = readFileSync(resolve(__dirname, '../../app.css'), 'utf8');

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

/*
 * Owner findings 2, 3 and 4 on the Träger-invite toolbar. Every number below was
 * measured with `getComputedStyle` in Chromium against the local Storybook story
 * `organisms-pages-links-invitecomposer--empty`, at 1440 / 820 / 390 — identical
 * at all three. Pre-Dev was not touched.
 *
 *   BEFORE                                    AFTER
 *   search pill      rgb(252,249,249) #fcf9f9  rgb(234,231,232) #eae7e8
 *   outlined field   rgba(0,0,0,0) over        unchanged (transparent over
 *                    rgb(228,226,226) #e4e2e2  the same workspace surface)
 *   E-Mail radius    4px                       28px 4px 4px 28px
 *   Vorname radius   4px                       4px            (interior)
 *   Name radius      4px                       4px 28px 28px 4px
 *   M3NumberField    28px 4px 4px 28px         unchanged (the reference)
 *
 * Findings 2 („farbe von text feldern und den outline felder unterschiedlich")
 * and 3 („nutze dunkle version") resolve to the same move: #fcf9f9 is
 * `--m3-surface`, near-white, and made the pill a sticker on a #e4e2e2 row.
 * #eae7e8 is `--m3-surface-container-high` — the token FloatingLabelInput
 * already names for its floating-label chip, and a step DOWN the container
 * ramp. One token, both findings, no new colour.
 *
 * Finding 4 („diese ecken müssen rund sein") is the group-radius grammar the
 * design system already speaks: 28px on a group's outer edge, 4px where
 * segments meet (`--sb-radius` / `--sb-radius-inner`, and M3NumberField's
 * `28px 4px 4px 28px`). E-Mail and Name are the group's two ends and were flat
 * on all four corners, so the row broke into squares between two pills.
 */
describe('Invite toolbar surface + radius contract (#713 findings 2-4)', () => {
    it('puts the search control on the same surface token as the outlined fields', () => {
        // Not `--m3-surface` (#fcf9f9): that is the near-white the owner rejected.
        expect(appTokens).toMatch(/--admin-search-surface:\s*#eae7e8;/);
        expect(appTokens).not.toMatch(/--admin-search-surface:\s*#fcf9f9;/);
        expect(rule(barStyles, '.search')).toMatch(
            /background:\s*var\(--admin-search-surface,\s*var\(--m3-surface-container-high,\s*#eae7e8\)\);/,
        );
    });

    it('keeps the search hover layer darker than its resting surface', () => {
        // #f0edee was LIGHTER than the new #eae7e8 resting pill, so hovering an
        // icon lifted it off the control instead of pressing it in.
        expect(appTokens).toMatch(/--admin-search-hover-surface:\s*#e4e2e2;/);
    });

    it('rounds the outer corners of the composer field group, not its seams', () => {
        expect(rule(composerStyles, '.emailField')).toMatch(/--fli-radius:\s*28px 4px 4px 28px;/);
        expect(rule(composerStyles, '.lastNameField')).toMatch(/--fli-radius:\s*4px 28px 28px 4px;/);
        // Vorname is an interior segment and must stay flat on both sides.
        expect(rule(composerStyles, '.nameField')).not.toMatch(/--fli-radius:/);
    });

    it('lets a field opt into a group radius without a specificity race', () => {
        // The consumer class (.emailField) and the component class (.field) sit
        // on the SAME element, so a plain `border-radius` override would be
        // decided by bundle order. The custom property has exactly one setter.
        expect(rule(fieldStyles, '.outline')).toMatch(/border-radius:\s*var\(--fli-radius,\s*4px\);/);
        expect(fieldStyles).not.toMatch(/--fli-radius:/);
    });
});

/*
 * Finding 1 — „Ich glaube, wir können den Text insgesamt sparen. Der sollte nur
 * da sein, wenn eine Fehlermeldung ist und was nicht frei ist oder so."
 *
 * The behaviour lives in IdAllocationField's own tests; what belongs here is the
 * layout consequence, because it is what the toolbar looked wrong for: the
 * Träger-ID group measured 76px tall (56px field box + 4px gap + 16px supporting
 * line) against 56px for every other control, and the row 88px. With the quiet
 * states rendering no supporting element the group is 56px and the row 68px, so
 * the controls share one band.
 */
describe('Invite toolbar height after dropping the informational hint (#713 finding 1)', () => {
    it('still aligns the row to the top so a real message can hang below', () => {
        // Dropping the hint must not become "centre them again": an error state
        // brings the supporting line back, and centring would move every other
        // control the moment it appears.
        expect(rule(barStyles, '.row')).toMatch(/align-items:\s*flex-start;/);
    });
});
