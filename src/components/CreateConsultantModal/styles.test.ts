import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { contrastRatio } from '../../utils/contrastRatio';

/*
 * Owner, 2026-09-19: "dann ist das popup halt in zwei columns designed fertig".
 *
 * The dialog now carries the whole counsellor field set, so its layout is part
 * of the requirement rather than decoration. These assertions read the
 * stylesheet as text — the convention established by
 * quietScrollbar.styles.test.ts — so that the two things that would silently
 * undo the design (losing the second column, or losing the collapse back to
 * one on a narrow viewport) fail loudly instead.
 */

const stylesheet = readFileSync(resolve(__dirname, './styles.module.scss'), 'utf8');

const ruleBody = (selector: string) => stylesheet.match(new RegExp(`\\${selector}\\s*{([^}]*)`))?.[1] ?? '';

describe('the quick-create dialog layout', () => {
    it('lays the field set out in two columns', () => {
        expect(ruleBody('.columns')).toMatch(/columns:\s*2;/);
    });

    it('never splits a single field across the column break', () => {
        // A label in one column and its input in the other is worse than one column.
        expect(stylesheet).toMatch(/break-inside:\s*avoid;/);
    });

    it('collapses to one column on a narrow viewport', () => {
        // Two 440px columns do not fit a phone, and a form the admin has to
        // scroll sideways through is not a form they can fill in.
        const narrow = stylesheet.match(/@media\s*\(max-width:[^)]*\)\s*{([\s\S]*?)\n}/)?.[1] ?? '';

        expect(narrow).toContain('.columns');
        expect(narrow).toMatch(/columns:\s*1;/);
    });

    it('bounds the sheet so its actions stay on screen', () => {
        // The whole counsellor form is taller than a laptop viewport; without
        // this the footer buttons sit below the fold with no way to reach them.
        expect(ruleBody('.dialog')).toMatch(/max-width/);
        expect(stylesheet).toMatch(/max-height:\s*calc\(100vh/);
        expect(stylesheet).toMatch(/overflow-y:\s*auto;/);
    });

    it('uses the house scrollbar treatment on that scroller', () => {
        // Every vertical dialog-body scroller in this app is quiet-thin rather
        // than hidden (see src/styles/_scrollbars.scss and the DPA forward
        // dialog). The thumb is what tells the admin the form continues past
        // the fold.
        expect(stylesheet).toMatch(/@include scrollbars\.quiet;/);
        expect(stylesheet).not.toMatch(/scrollbar-width:\s*none/);
    });
});

describe('the dialog text contrast', () => {
    /*
     * The sentence under a disabled trigger is the one that tells the admin how
     * to unblock themselves. At 14px it is not "large text", so WCAG 2.2 SC
     * 1.4.3 asks for 4.5:1 — a muted caption grey would land around 3:1.
     */
    it('states the disabled reason at body contrast, not caption grey', () => {
        const fallbacks = [...stylesheet.matchAll(/color:\s*var\([^,]+,\s*(#[0-9a-f]{3,6})\)/gi)].map(([, hex]) => hex);

        expect(fallbacks.length).toBeGreaterThan(0);
        fallbacks.forEach((hex) => {
            expect(contrastRatio(hex, '#ffffff')).toBeGreaterThanOrEqual(4.5);
        });
    });

    it('does not reach for a muted foreground token', () => {
        expect(stylesheet).not.toMatch(/text-secondary|text-disabled|--black-60/);
    });
});
