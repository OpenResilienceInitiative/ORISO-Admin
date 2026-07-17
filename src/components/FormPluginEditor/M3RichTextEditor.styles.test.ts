import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const editorStyles = readFileSync(resolve(__dirname, './M3RichTextEditor.module.scss'), 'utf8');

describe('M3RichTextEditor functionality hint layout', () => {
    it('keeps the dismissible hint in document flow so it cannot cover legal text', () => {
        const hintRule = editorStyles.match(/\.hintSnackbar\s*\{([\s\S]*?)\n\}/)?.[1] ?? '';

        expect(hintRule).toContain('display: flex;');
        expect(hintRule).toContain('margin: 8px 16px 0;');
        expect(hintRule).not.toMatch(/position:\s*(absolute|fixed|sticky)/);
    });

    it('scrolls document content separately from the anchor row', () => {
        const anchorRule = editorStyles.match(/\.editor \.anchorNav\s*\{([\s\S]*?)\n\}/)?.[1] ?? '';

        expect(editorStyles).toMatch(/\.editorContentScroll\s*\{[\s\S]*?overflow-y:\s*auto;/);
        expect(anchorRule).toContain('flex-shrink: 0;');
        expect(anchorRule).not.toMatch(/position:\s*(absolute|fixed|sticky)/);
    });

    it('starts the mobile function bar at the first control instead of clipping it to the left', () => {
        expect(editorStyles).toMatch(
            /\.functionBar\s*\{[\s\S]*?@media \(max-width: 599px\)\s*\{[\s\S]*?justify-content:\s*flex-start;/,
        );
    });
});
