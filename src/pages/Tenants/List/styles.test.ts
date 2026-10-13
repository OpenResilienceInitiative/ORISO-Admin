import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const listStyles = readFileSync(resolve(__dirname, './styles.module.scss'), 'utf8');

// ORISO-Admin#1195: a search field with a non-shrinking 499px basis overflows a phone-width toolbar.
describe('Träger list search field', () => {
    it('shrinks with the toolbar and only caps its growth', () => {
        const rule = listStyles.match(/\.searchField\s*{([^}]*)}/s)?.[1] ?? '';

        expect(rule).not.toMatch(/flex:\s*0\s+0\s+\d+px/);
        expect(rule).toMatch(/flex:\s*1\s+1\s+auto/);
        expect(rule).toMatch(/max-width:\s*499px/);
    });
});
