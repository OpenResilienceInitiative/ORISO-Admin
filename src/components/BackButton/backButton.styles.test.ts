import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vite-plus/test';

const styles = readFileSync(resolve(__dirname, './styles.module.scss'), 'utf8');

/*
 * Contract of the page-header back button. The old one was a dark-red filled oval
 * (#5a0000) that sat on the sidebar edge; these assertions keep that look from coming back
 * and pin the sizes the 16px raster depends on.
 */
describe('BackButton styles', () => {
    it('has no colour literal outside a token fallback', () => {
        const withoutTokens = styles.replace(/var\([^)]*\)/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
        expect(withoutTokens).not.toMatch(/#[0-9a-f]{3,8}\b/i);
        expect(styles).not.toMatch(/5a0000/i);
    });

    it('is 40px high and a 40px circle, with a 48px hit area around it', () => {
        expect(styles).toMatch(/\.root\s*\{[^}]*height:\s*40px/);
        expect(styles).toMatch(/\.circle\s*\{[^}]*width:\s*40px[^}]*height:\s*40px/);
        expect(styles).toMatch(/&:before\s*\{[^}]*inset:\s*-4px/);
    });

    it('uses the focus ring of the other buttons', () => {
        const ring = styles.match(/&:focus-visible,\s*&:global\(\.pseudo-focus-visible\)\s*\{[^}]*\}/)?.[0] ?? '';
        expect(ring).toMatch(/outline:\s*2px solid var\(--m3-primary/);
        expect(ring).toMatch(/outline-offset:\s*2px/);
    });

    it('colours the tonal circle neutral, not with the brand colour', () => {
        const circle = styles.match(/\.circle\s*\{[^}]*\}/)?.[0] ?? '';
        expect(circle).toMatch(/--m3-surface-container-highest/);
        expect(circle).not.toMatch(/--m3-primary/);
    });

    it('uses the M3 state layers: 8% on hover, 10% on focus and press', () => {
        expect(styles).toMatch(/opacity:\s*0\.08/);
        expect(styles).toMatch(/opacity:\s*0\.1\b/);
    });

    it('shortens a long label with an ellipsis instead of growing the row', () => {
        const label = styles.match(/\.label\s*\{[^}]*\}/)?.[0] ?? '';
        expect(label).toMatch(/overflow:\s*hidden/);
        expect(label).toMatch(/text-overflow:\s*ellipsis/);
        expect(label).toMatch(/white-space:\s*nowrap/);
        expect(styles).toMatch(/\.tooltipSlot\s*\{[^}]*min-width:\s*0/);
    });
});
