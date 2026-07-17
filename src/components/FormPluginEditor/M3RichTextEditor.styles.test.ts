import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const editorStyles = readFileSync(resolve(__dirname, './M3RichTextEditor.module.scss'), 'utf8');

describe('M3RichTextEditor functionality hint layout', () => {
    it('floats the dismissible hint OVER the text surface (owner decision, round 9)', () => {
        const hintRule = editorStyles.match(/\.hintSnackbar\s*\{([\s\S]*?)\n\}/)?.[1] ?? '';

        // The snackbar hovers 6px inside the white surface, above the chapter
        // chips — it must NOT sit in the document flow below the editor.
        expect(hintRule).toContain('position: absolute;');
        expect(hintRule).toContain('bottom: 6px;');
        expect(hintRule).toMatch(/z-index:\s*[1-9]/);
        // Read mode is the exception: no white surface, so the hint flows below.
        expect(editorStyles).toMatch(/\.readMode \.hintSnackbar\s*\{[\s\S]*?position:\s*static;/);
        // With a chapter chip footer the hint is lifted above it.
        expect(editorStyles).toMatch(/\.hasAnchors \.hintSnackbar\s*\{[\s\S]*?bottom:\s*52px;/);
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
