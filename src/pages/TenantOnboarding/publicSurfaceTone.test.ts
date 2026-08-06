import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(__dirname, path), 'utf8');

const publicLayout = read('../../styles/components/publicLayout.less');
const loginForm = read('../../styles/components/loginForm.less');
const onboarding = read('./styles.module.scss');
const editor = read('../../components/FormPluginEditor/M3RichTextEditor.module.scss');

/** Body of a TOP-LEVEL rule (column 0 selector, closing brace at column 0). */
const block = (source: string, selector: string) =>
    source.match(new RegExp(`^${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} \\{([\\s\\S]*?)\\n\\}`, 'm'))?.[1] ??
    '';

/**
 * ONE background tone for the public surface, and no boxes on it
 * (#594.12 / #594.17).
 *
 * The restrained light grey the onboarding completion screen already used IS
 * the product's background colour — `--m3-surface-container-high`, the tone
 * `Organisms/Modal` uses for its sheet. The login was white, which is the
 * inconsistency that made the whole public surface look unfinished. Once the
 * page carries that tone, everything that used to paint it again — the
 * onboarding sheet, the reader card — would only draw a box around content
 * that is already on the right surface, so they stop painting.
 *
 * jsdom computes no layout and no cascade across LESS/SCSS modules, so this is
 * asserted on the stylesheets; the computed values were read back in the
 * browser (see the PR).
 */
describe('public surface — one tone, no boxes', () => {
    it('paints the public page and its shell with the product background tone', () => {
        expect(block(publicLayout, '.publicContent')).toMatch(/background-color:\s*var\(--m3-surface-container-high/);
        expect(block(publicLayout, '.publicLayout')).toMatch(/background-color:\s*var\(--m3-surface-container-high/);
    });

    it('leaves no white left on the public surface, autofill included', () => {
        expect(block(publicLayout, '.publicContent')).not.toMatch(/background-color:\s*@white/);
        expect(loginForm).toMatch(/--input-autofill-surface:\s*var\(--m3-surface-container-high/);
    });

    it('stops the onboarding sheet from painting a second sheet on top of it', () => {
        const sheet = block(onboarding, '.sheet');

        expect(sheet).not.toMatch(/background:/);
        expect(sheet).not.toMatch(/box-shadow:/);
        expect(sheet).not.toMatch(/border-radius:/);
    });

    it('removes the grey box, the outline and the rule around the agreement text', () => {
        const fluid = block(editor, '.module.fluid:not(.inDialog)');

        expect(fluid).toMatch(/background:\s*none/);
        expect(fluid).toMatch(/border:\s*0/);
        expect(fluid).toMatch(/box-shadow:\s*none/);
        // The header hairline was part of the frame.
        expect(fluid).toMatch(/\.headerDivider \{[\s\S]*?display:\s*none/);
    });

    /**
     * The one element that must stay opaque: the sticky chapter bar. It masks
     * the text scrolling underneath it — without a fill the agreement would
     * read as clipped rather than as "behind the bar".
     */
    it('keeps the sticky chapter bar opaque in the page tone', () => {
        expect(block(editor, '.module.fluid:not(.inDialog)')).toMatch(
            /\.editor \.anchorNav \{[\s\S]*?background:\s*var\(--m3-surface-container-high/,
        );
    });
});
