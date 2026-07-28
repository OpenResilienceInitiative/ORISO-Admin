import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const styles = readFileSync(resolve(__dirname, './floatingLabelSelect.module.scss'), 'utf8');
const component = readFileSync(resolve(__dirname, './index.tsx'), 'utf8');

/**
 * The M3 shell fixes the outline at 56px, which is right for a single value. A multi-select's
 * tags wrap onto further rows — with all 16 topics selected on an agency they escaped their own
 * border and overlapped the fields below. The selector was already allowed to grow; the outline
 * around it was not.
 */
describe('FloatingLabelSelect — multi-select outline', () => {
    it('lets the outline grow with wrapped tags instead of clipping at 56px', () => {
        const rule = styles.match(/\.hasMultiSelect\s+\.outline\s*{([\s\S]*?)\n}/)?.[1] ?? '';

        expect(rule).toMatch(/height:\s*auto/);
        expect(rule).toMatch(/min-height:\s*56px/);
    });

    it('keeps the single-value outline at the fixed M3 height', () => {
        // The growth must be opt-in: a normal select still has to line up with the text fields
        // beside it, which are a fixed 56px.
        const selectorRule = styles.match(/&:global\(\.ant-select-multiple\)[\s\S]*?\n {4}}/)?.[0] ?? '';
        const baseOutlineRule = styles.match(/\n\.outline\s*{([\s\S]*?)\n}/)?.[1] ?? '';

        expect(selectorRule).toMatch(/height:\s*auto/);
        // The unqualified `.outline` only composes the shared shell — it must not relax the height
        // for every select, or single-value fields stop lining up with the inputs beside them.
        expect(baseOutlineRule).not.toMatch(/height/);
    });

    it('applies the growing outline only in multiple/tags mode', () => {
        expect(component).toMatch(/hasMultiSelect\]:\s*mode === 'multiple' \|\| mode === 'tags'/);
    });
});
