import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vite-plus/test';

const styles = readFileSync(resolve(__dirname, './styles.module.scss'), 'utf8');

/*
 * The old page-header back button was a dark-red filled oval (#5a0000). This source guard keeps a
 * colour literal from creeping back in. Sizes (40px visual, 48px hit area), the focus ring, the
 * ellipsis and the tooltip are measured in a real browser by the Storybook interaction tests
 * ("Molecules/BackButton"), not parsed out of the stylesheet here.
 */
describe('BackButton styles', () => {
    it('has no colour literal outside a token fallback', () => {
        const withoutTokens = styles.replace(/var\([^)]*\)/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
        expect(withoutTokens).not.toMatch(/#[0-9a-f]{3,8}\b/i);
        expect(styles).not.toMatch(/5a0000/i);
    });
});
