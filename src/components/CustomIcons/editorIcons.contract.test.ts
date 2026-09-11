import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const versionHistorySvg = readFileSync(resolve(__dirname, '../../resources/img/svg/clock-arrow-down.svg'), 'utf8');
const editorModuleStyles = readFileSync(resolve(__dirname, '../FormPluginEditor/M3RichTextEditor.module.scss'), 'utf8');

/*
 * Owner report 2026-08-19 ("revert squeezing", legal editor): the clock/history
 * icon in the version split button rendered visibly distorted. Root cause,
 * measured on the rendered element: the SVG source shipped
 * `preserveAspectRatio="none"` on a NON-square viewBox (18.33 x 13.33), so the
 * square icon box the CSS prescribes stretched the glyph instead of fitting
 * it. The reference chip bar the owner pointed at (Page tabs, MUI icons with a
 * square viewBox) cannot squeeze for exactly this reason.
 *
 * The owner's requirement: the icon box is 24 x 24 px, undistorted.
 */
describe('version-history icon — never squeezed, 24px box (owner report 2026-08-19)', () => {
    it('keeps aspect-ratio preservation on the SVG — "none" is what stretched the glyph', () => {
        expect(versionHistorySvg).not.toContain('preserveAspectRatio="none"');
    });

    it('paints with currentColor so the control states (open = publish red) recolor it', () => {
        // EditorIcons.tsx documents "all fills use currentColor"; a hardcoded
        // hex kept the glyph grey-blue even in the elevated open state.
        expect(versionHistorySvg).toContain('fill="currentColor"');
        expect(versionHistorySvg).not.toMatch(/fill="#/);
    });

    it('sizes the split-button leading icon box at 24x24, shrink-proof', () => {
        const leading = editorModuleStyles.match(/\.versionLeading\s*{[\s\S]*?\n}/)?.[0] ?? '';
        expect(leading).toMatch(/svg\s*{[^}]*width:\s*24px;/);
        expect(leading).toMatch(/svg\s*{[^}]*height:\s*24px;/);
        expect(leading).toMatch(/svg\s*{[^}]*flex-shrink:\s*0;/);
        // antd's <Icon> wrapper sizes itself via font-size (1em) — it must
        // agree with the svg box or the wrapper mis-centres the glyph.
        expect(leading).toMatch(/\.anticon\)?\s*{[^}]*font-size:\s*24px;/);
    });
});
