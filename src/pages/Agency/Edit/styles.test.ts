import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const styles = readFileSync(resolve(__dirname, './styles.module.scss'), 'utf8');

describe('agency creation card deck', () => {
    it('uses 420px cards with 32px between them', () => {
        const deck = styles.match(/\.createCardDeck\s*{([\s\S]*?)\n}/)?.[1] ?? '';
        expect(deck).toMatch(/--card-deck-item-min-width:\s*420px/);
        expect(deck).toMatch(/--card-deck-item-width:\s*420px/);
        expect(deck).toMatch(/--card-deck-gap:\s*32px/);
    });
});
