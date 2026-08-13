import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const styles = readFileSync(resolve(__dirname, './styles.module.scss'), 'utf8');
const source = readFileSync(resolve(__dirname, './index.tsx'), 'utf8');

describe('tenant creation card navigation', () => {
    // The arrows live in the page header now (Figma 1285-80496), so the page no
    // longer positions a footer of its own — it only sizes the deck.
    it('lets the deck fill the page instead of reserving footer space', () => {
        const deck = styles.match(/\.tenantCardDeck\s*{([\s\S]*?)\n}/)?.[1] ?? '';

        expect(deck).toMatch(/--card-deck-min-height:\s*0/);
        expect(styles).not.toContain('tenantCardDeckFooter');
        expect(source).not.toContain('footerClassName');
    });
});
