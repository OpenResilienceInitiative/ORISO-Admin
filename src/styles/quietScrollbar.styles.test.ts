import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/*
 * JOB10 (owner report, 2026-08-19): "Remove the scrollbars in firefox, edge,
 * safari browsers, or that you only see them when scrolling. Also in the main
 * signup module they are even more visible."
 *
 * The screenshot shows a permanent grey scroll TRACK down the right edge of
 * the contract document box. macOS paints overlay scrollbars that already fade
 * when idle; Firefox and Edge paint a classic always-on track, which is why
 * only those browsers were named.
 *
 * The chosen treatment is trackless-thin ("quiet"), NOT hidden — see
 * src/styles/_scrollbars.scss for the full reasoning. The short version: every
 * surface below is a VERTICAL reader or form scroller, and the thumb is the
 * only thing that tells a reader a contract continues past the fold. Deleting
 * it would trade a cosmetic complaint for a WCAG 2.2 regression. The full-hide
 * pattern stays where it already lives: horizontal control rows that carry
 * their own edge-fade and arrow affordances.
 *
 * These assertions read the stylesheets as text (the convention established by
 * legalReader.styles.test.ts). If one goes red, either a scroll surface lost
 * its treatment or someone swapped it for the full-hide pattern. Do not
 * "fix" a failure by deleting the assertion — read _scrollbars.scss first.
 */

const read = (relativePath: string) => readFileSync(resolve(__dirname, '..', relativePath), 'utf8');

const scrollbarsPartial = readFileSync(resolve(__dirname, './_scrollbars.scss'), 'utf8');

// The prose above the mixin names both `scrollbar-width: none` and the webkit
// pseudo-element while explaining why they are NOT used here, so the negative
// assertions below have to read the mixin BODY rather than the whole file.
const quietMixinBody = scrollbarsPartial.match(/@mixin quiet\s*{[\s\S]*?\n}/)?.[0] ?? '';

describe('quiet scrollbar mixin', () => {
    it('thins the scrollbar and makes the track transparent', () => {
        // Two declarations, both standard properties. `transparent` as the
        // second `scrollbar-color` value IS the fix: it removes the grey
        // channel while leaving the thumb to do its job.
        expect(quietMixinBody).toMatch(/scrollbar-width:\s*thin;/);
        expect(quietMixinBody).toMatch(/scrollbar-color:\s*var\(--m3-outline-variant, #c4c7c8\) transparent;/);
    });

    it('never pairs the standard properties with the webkit pseudo-element', () => {
        // Chromium drops that styling the moment `scrollbar-width` is set
        // (documented in globalSearchBar.module.scss). A webkit block here
        // would be dead code that reads as a live fallback.
        expect(quietMixinBody).not.toMatch(/-webkit-scrollbar/);
    });

    it('does not hide the scrollbar outright', () => {
        // `scrollbar-width: none` here would silently strip the affordance
        // from every surface that includes the mixin.
        expect(quietMixinBody).not.toMatch(/scrollbar-width:\s*none/);
    });

    it('stays silent in the compiled bundle', () => {
        // Four modules `@use` this partial, and Sass copies a loud comment
        // block into the compiled output of every one of them. Matches a
        // comment OPENING a line, so the partial's own prose can still quote
        // the syntax it is warning about.
        expect(scrollbarsPartial).not.toMatch(/^\s*\/\*/m);
    });
});

describe('the legal/contract reader — surface 1 of the owner report', () => {
    const editorStyles = read('components/FormPluginEditor/M3RichTextEditor.module.scss');

    it('treats the reading viewport once, for all three scrolling variants', () => {
        // `.editorContentScroll` becomes a scroller in three separate blocks
        // (the 800x740 deck card >=600px, the fullscreen dialog, and the
        // bounded fluid READ card). A single top-level rule covers all of
        // them; on the non-scrolling fluid WRITE variant it is inert.
        expect(editorStyles).toMatch(/\n\.editorContentScroll\s*{\s*@include scrollbars\.quiet;\s*\n}/);
    });

    it('keeps the reading viewport scrollable rather than hiding its scrollbar', () => {
        // A DPA runs to several screens. The chapter bar under the box
        // navigates BETWEEN chapters; it says nothing about how much of the
        // current chapter is left, so the thumb has to stay.
        expect(editorStyles).not.toMatch(/\.editorContentScroll\s*{[^}]*scrollbar-width:\s*none/);
    });
});

describe('the signup surfaces — surface 2 of the owner report ("even more visible")', () => {
    it('quiets the public page shell, the scroller the app gave back to the page', () => {
        // publicLayout.less is in the LESS pipeline and cannot @use the SCSS
        // partial, so it repeats the two declarations literally. This test is
        // what keeps that copy honest.
        const publicLayout = read('styles/components/publicLayout.less');
        expect(publicLayout).toMatch(/\.publicLayout\s*{[\s\S]*scrollbar-width:\s*thin;/);
        expect(publicLayout).toMatch(
            /\.publicLayout\s*{[\s\S]*scrollbar-color:\s*var\(--m3-outline-variant, #c4c7c8\) transparent;/,
        );
    });

    it('quiets the onboarding sheet body without giving up its stable gutter', () => {
        // The gutter is what stops the step content shifting sideways when a
        // step grows past the fold — it is a layout fix, not the defect. Only
        // the track had to go.
        const onboarding = read('pages/TenantOnboarding/styles.module.scss');
        expect(onboarding).toMatch(/\.sheetBody\s*{[\s\S]*scrollbar-gutter:\s*stable;/);
        expect(onboarding).toMatch(/\.sheetBody\s*{[\s\S]*@include scrollbars\.quiet;/);
    });

    it('quiets the DPA forward dialog body', () => {
        const forwardDialog = read('components/DpaForwardDialog/styles.module.scss');
        expect(forwardDialog).toMatch(/\.ant-modal-body\s*{[\s\S]*@include scrollbars\.quiet;/);
    });
});

describe('the DPA blocker — the reader surface inside the admin', () => {
    const blockerStyles = read('components/DpaBlocker/styles.module.scss');

    it('quiets the full-viewport overlay, which reads as the window scrollbar', () => {
        expect(blockerStyles).toMatch(/\.overlay\s*{[\s\S]*@include scrollbars\.quiet;/);
    });

    it('quiets the card body that scrolls the sign form', () => {
        expect(blockerStyles).toMatch(/\.cardBody\s*{[\s\S]*@include scrollbars\.quiet;/);
    });
});

describe('the horizontal control rows keep the full-hide pattern', () => {
    /*
     * Guard against an over-eager future sweep that "unifies" every scrollbar
     * onto the quiet mixin. These rows are hidden on purpose and each already
     * carries a REPLACEMENT affordance — the chapter row has a 32px edge fade
     * plus prev/next arrows (pinned by legalReader.styles.test.ts). Giving
     * them a visible thumb back would put a scrollbar under the chips the fade
     * exists to dissolve.
     */
    it('keeps the chapter-chip row hidden behind its edge fade', () => {
        const editorGlobals = read('components/FormPluginEditor/FormPluginEditor.styles.scss');
        const row = editorGlobals.match(/&-anchorNavRow\s*{[\s\S]*?\n {4}}/)?.[0] ?? '';
        expect(row).toMatch(/scrollbar-width:\s*none;/);
        expect(row).toMatch(/&::-webkit-scrollbar\s*{[\s\S]*display:\s*none;/);
    });
});
