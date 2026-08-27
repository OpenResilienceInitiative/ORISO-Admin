import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const moduleStyles = readFileSync(resolve(__dirname, './M3RichTextEditor.module.scss'), 'utf8');
const globalStyles = readFileSync(resolve(__dirname, './FormPluginEditor.styles.scss'), 'utf8');

/*
 * Layout contract of the READ-ONLY legal reader — the surface behind the
 * owner's 2026-08-18 before-state annotations H1/H2 (text inset), H4/I3 (the
 * chapter-chip bar), reported broken twice before this file existed.
 *
 * Measured with Playwright at revision 3fb58d9 (the deployed Admin image),
 * production bundle, REAL pre-dev DPA content (tenant 1, 4 chapters), at
 * 390/820/1440 — BEFORE the fix:
 *
 *   - body text to its clipping frame (`editorContentScroll`):
 *     left 0-1px, right 0-1px on EVERY read surface (onboarding wizard step,
 *     DPA blocker, fullscreen reader dialog, legal-settings deck card). That
 *     is the "text braucht padding min. 8px … an allen 4 Seiten!" defect: an
 *     earlier owner call (2026-07-30) had deliberately removed the side inset.
 *     The 2026-08-18 annotation reverses that call — on purpose, in writing.
 *   - chapter-chip row: the last visible chip was hard-clipped mid-letter by
 *     27-228px depending on surface and width ("Anlage 3" rendered as "A|"),
 *     with no visual hint that the row scrolls.
 *
 * AFTER the fix the same measurements read: text inset 8px left and right
 * (vertical 8px via `.readMode .editor`), and the clipped chip dissolves in a
 * 32px edge fade that only shows while that side can still scroll.
 *
 * If any assertion here goes red, one of those two owner-visible defects is
 * back. Do not delete a failing assertion — read the comment above it and the
 * PR that introduced it first.
 */
describe('read-mode legal reader — text inset (before-state H1/H2, 2026-08-18)', () => {
    it('gives the reading text an 8px side inset inside the read-mode card', () => {
        // The inset lives on `.editorContentScroll` (the text viewport), NOT on
        // `.editor`: the chapter bar is a sibling inside `.editor` and must
        // keep spanning the full surface so its opaque sticky background masks
        // the text scrolling underneath it.
        const readMode = moduleStyles.match(/\.readMode\s*{[\s\S]*?\n}/)?.[0] ?? '';
        expect(readMode).toMatch(/\.editorContentScroll\s*{[^}]*padding-inline:\s*8px;/);
    });

    it('keeps the 8px vertical padding of the read-mode text surface', () => {
        // `.readMode .editor { padding: 8px 0 }` — the vertical half of the
        // "8px on all four sides" annotation. The `0` is fine: the horizontal
        // 8px comes from `.editorContentScroll` above.
        const readMode = moduleStyles.match(/\.readMode\s*{[\s\S]*?\n}/)?.[0] ?? '';
        expect(readMode).toMatch(/\.editor\s*{[^}]*padding:\s*8px 0;/);
    });
});

describe('chapter-chip bar — control inset survives (#818, re-verified 2026-08-18)', () => {
    // #818's 16px chip-bar inset was reported lost on the deployed environment;
    // it was in fact deployed and live (measured navPadding "16px 16px 8px
    // 16px" in the production bundle at 3fb58d9). These assertions keep it
    // from ACTUALLY disappearing in a future refactor.
    it('keeps the fluid reader sticky bar inset 16px left and right', () => {
        expect(moduleStyles).toMatch(/padding:\s*16px 16px 8px;/);
    });

    it('keeps the deck-card chip bar inset 16px left and right', () => {
        expect(moduleStyles).toMatch(/padding:\s*16px 16px 0;/);
    });
});

describe('fluid READ card — text scrolls in its own box, the chapter bar stands still (owner demo 2026-08-19)', () => {
    /*
     * Owner demo (positions 1-4, tenant-onboarding AVV step): the chapter bar
     * was `position: sticky` against the HOST scrollport, so it travelled up
     * and down with the page and detached entirely once the card's end came
     * into view; a chip click then re-scrolled the page and moved the bar out
     * from under the cursor ("Ich muss zweimal drüber"). Position 1 — bar
     * standing still, text moving — is the demanded state: „das Menü einfach
     * starr bleibt, wo es ist … der Text in der Textbox sich bewegt".
     *
     * This DELIBERATELY reverses #594.3's "the fluid card is not a scroll
     * container" for READ mode only: the reading viewport is bounded and
     * scrolls internally (the same pattern the 800x740 deck card and the
     * fullscreen dialog already use), and the chapter bar sits statically
     * below it. Fluid WRITE mode (Erstantwort editor) keeps host scrolling.
     */
    const fluidReadBlock = () =>
        moduleStyles.match(/\.module\.fluid\.readMode:not\(\.inDialog\)\s*{[\s\S]*?\n}/)?.[0] ?? '';

    it('bounds the read-mode text viewport and lets it scroll internally', () => {
        const block = fluidReadBlock();
        expect(block).toMatch(/\.editorContentScroll\s*{[^}]*max-height:\s*clamp\(280px,\s*60vh,\s*640px\);/);
        expect(block).toMatch(/\.editorContentScroll\s*{[^}]*overflow-y:\s*auto;/);
    });

    it('unpins the chapter bar from the host scrollport — it stands below the box instead', () => {
        expect(fluidReadBlock()).toMatch(/\.anchorNav\s*{[^}]*position:\s*static;/);
    });

    it('drops the 56px sticky-bar clearance the internal box no longer needs', () => {
        // The clearance existed so the sticky bar never covered the last lines;
        // with a static bar OUTSIDE the scroll box it would just be dead space
        // that scrolls the final lines away from the reader's edge.
        const block = fluidReadBlock();
        expect(block).toMatch(/\.editorContentScroll\s*{[^}]*padding:\s*8px;/);
        expect(block).toMatch(/\.editorContentScroll\s*{[^}]*scroll-margin-bottom:\s*0;/);
    });
});

describe('chapter-chip row — scrolls with a visible affordance (H4/I3, 2026-08-18)', () => {
    it('keeps the chips on one scrollable line (Figma 1299-81676)', () => {
        // Wrapping was measured and rejected: 11 chips would stack three rows
        // into the sticky bottom bar at 390px and eat the reading space.
        const row = globalStyles.match(/&-anchorNavRow\s*{[\s\S]*?\n {4}}/)?.[0] ?? '';
        expect(row).toMatch(/flex-wrap:\s*nowrap;/);
        expect(row).toMatch(/overflow-x:\s*auto;/);
    });

    it('fades the clipped edge instead of hard-cutting a chip mid-letter', () => {
        // The BEFORE state showed "Anlage 3…" cut down to "A|" (27-228px of the
        // last visible chip hidden) with no hint of scrollability. The fade is
        // a mask, not an overlay, so it cannot tint the chips or cover the
        // click targets; AnchorChips toggles it per side alongside the arrows.
        expect(globalStyles).toMatch(
            /&--fadeEnd\s*{[^}]*mask-image:\s*linear-gradient\(to right,\s*#000000 calc\(100% - 32px\), transparent\);/,
        );
        expect(globalStyles).toMatch(
            /&--fadeStart\s*{[^}]*mask-image:\s*linear-gradient\(to right,\s*transparent,\s*#000000 32px\);/,
        );
        // Both sides scrollable -> both edges fade (single combined mask; two
        // mask-image declarations would overwrite each other).
        expect(globalStyles).toMatch(/&--fadeStart#{&}--fadeEnd/);
    });
});

describe('boxless fluid reader — no vestigial corner radius (owner report 2026-08-19)', () => {
    /*
     * The owner reported the maximize control "abgeschnitten … in der oberen
     * rechten Ecke" on the public onboarding reader.
     *
     * Measured live on predev.oriso.org (tenant-onboarding wizard, 1440x900,
     * getComputedStyle) BEFORE the fix:
     *
     *   .maximizeToolBtn   28x28, border-radius 50%, rect top 235 / right 1328
     *   .module.fluid.readMode  overflow "clip", border-radius "28px",
     *                           rect top 235 / right 1328
     *                           background rgba(0,0,0,0), border 0px none,
     *                           box-shadow none
     *
     * The button's corner IS the container's corner, and a 28px arc through a
     * 28px control slices it. The radius is a leftover: `.module` styles an
     * 800px card, but the fluid reader explicitly gives up `background`,
     * `border` and `box-shadow` ("The public reader is not a card … it IS the
     * page", #594.17). Nothing visible is rounded any more — the radius only
     * still clips. So the box's radius goes with the rest of the box, rather
     * than the control being nudged away from a corner that no longer exists.
     */
    it('drops the card radius wherever it drops the card background', () => {
        const fluid = moduleStyles.match(/\.module\.fluid:not\(\.inDialog\)\s*{[\s\S]*?\n}/)?.[0] ?? '';
        expect(fluid).not.toBe('');
        // The three rules that already retire the box …
        expect(fluid).toMatch(/background:\s*none;/);
        expect(fluid).toMatch(/border:\s*0;/);
        expect(fluid).toMatch(/box-shadow:\s*none;/);
        // … and the radius that framed it must retire with them.
        expect(fluid).toMatch(/border-radius:\s*0;/);
    });

    it('keeps clipping the boxless reader so the chip row is not trapped', () => {
        // `clip` (not `hidden`) stays: it must not become a scroll container,
        // which would trap the sticky chapter bar. With a 0 radius it clips to
        // a plain rectangle, so nothing eats the control any more.
        const fluid = moduleStyles.match(/\.module\.fluid:not\(\.inDialog\)\s*{[\s\S]*?\n}/)?.[0] ?? '';
        expect(fluid).toMatch(/overflow:\s*clip;/);
    });

    it('leaves the 800px deck card its rounded corners', () => {
        // Only the boxless fluid reader loses the radius. The real card — the
        // one that still paints a surface and a shadow — keeps it.
        const base = moduleStyles.match(/^\.module\s*{[\s\S]*?\n}/m)?.[0] ?? '';
        expect(base).toMatch(/border-radius:\s*28px;/);
        expect(base).toMatch(/box-shadow:/);
    });
});
