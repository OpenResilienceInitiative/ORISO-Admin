import { resolve } from 'node:path';
import { compile } from 'sass';
import { describe, expect, it } from 'vitest';

/*
 * Type-role contract of the legal-document editor headings (owner decision
 * 2026-08-19, voice note): "die Header sind ... eindeutig oft zu groß ...
 * das muss nicht so riesig sein".
 *
 * The Figma reference (1280-73020) put M3 DISPLAY sizes (57/45/36) on the
 * desktop editor — the hero/marketing role. Above 16px body text that is a
 * 3.5:1 ratio, a display relationship, not a document one. The owner's call
 * deliberately overrides that Figma scale: running document text uses the M3
 * HEADLINE roles (32/28/24) at every width — exactly what the mobile
 * breakpoint already used before this contract existed.
 *
 * These assertions run against the COMPILED stylesheet, so they hold no
 * matter how the SCSS nesting is reorganised. If one goes red, the editor
 * (or the read-only DPA/onboarding reader, which shares this stylesheet)
 * has left the headline scale — read this comment before "fixing" the test.
 */

const compiled = compile(resolve(__dirname, './M3RichTextEditor.module.scss')).css;

/** Every declaration block in the compiled CSS whose selector targets `.ProseMirror <tag>`. */
const headingBlocks = (tag: 'h1' | 'h2' | 'h3'): string[] => {
    // Compiled css-modules output keeps the `:global(...)` wrapper; match any
    // selector that ends in the heading tag within a `.ProseMirror` scope.
    const rule = new RegExp(String.raw`[^{}]*\.ProseMirror ${tag}\)?[^{}a-z0-9-]*\{([^}]*)\}`, 'g');
    return [...compiled.matchAll(rule)].map(([, block]) => block);
};

const declarations = (block: string, property: string): string[] =>
    [...block.matchAll(new RegExp(`(?:^|[;\\s])${property}\\s*:\\s*([^;]+);`, 'g'))].map(([, value]) => value.trim());

const M3_HEADLINE = {
    h1: { fontSize: '32px', lineHeight: '40px' },
    h2: { fontSize: '28px', lineHeight: '36px' },
    h3: { fontSize: '24px', lineHeight: '32px' },
} as const;

describe('editor heading scale — M3 headline roles at every width (owner call 2026-08-19)', () => {
    (['h1', 'h2', 'h3'] as const).forEach((tag) => {
        it(`resolves every ${tag} rule to headline size ${M3_HEADLINE[tag].fontSize}/${M3_HEADLINE[tag].lineHeight}`, () => {
            const blocks = headingBlocks(tag);
            expect(blocks.length).toBeGreaterThan(0);

            const fontSizes = blocks.flatMap((block) => declarations(block, 'font-size'));
            const lineHeights = blocks.flatMap((block) => declarations(block, 'line-height'));

            // The scale must hold in EVERY scope (desktop card, mobile
            // breakpoint, fluid reader) — a single diverging override brings
            // the "riesig" state back on one surface only.
            expect(fontSizes.length).toBeGreaterThan(0);
            fontSizes.forEach((value) => expect(value).toBe(M3_HEADLINE[tag].fontSize));
            lineHeights.forEach((value) => expect(value).toBe(M3_HEADLINE[tag].lineHeight));
        });
    });

    it('banishes the M3 display sizes (57/45/36) from every heading rule', () => {
        (['h1', 'h2', 'h3'] as const).forEach((tag) => {
            const fontSizes = headingBlocks(tag).flatMap((block) => declarations(block, 'font-size'));
            fontSizes.forEach((value) => {
                expect(['57px', '45px', '36px']).not.toContain(value);
            });
        });
    });

    it('keeps headline tracking at 0 — no display-large negative letter-spacing on h1', () => {
        headingBlocks('h1').forEach((block) => {
            declarations(block, 'letter-spacing').forEach((value) => expect(value).toBe('0'));
        });
    });

    it('keeps the document body/heading relationship: h1 at 2x body-large (32/16), not 3.5x', () => {
        const h1Sizes = headingBlocks('h1').flatMap((block) => declarations(block, 'font-size'));
        expect(h1Sizes.length).toBeGreaterThan(0);
        h1Sizes.forEach((value) => expect(parseFloat(value)).toBeLessThanOrEqual(2 * 16));
    });
});
