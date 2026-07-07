import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const cardDeckStyles = readFileSync(resolve(__dirname, './styles.module.scss'), 'utf8');

describe('CardDeck responsive contract', () => {
    it('stacks cards and hides the side-scroll footer across smartphone widths', () => {
        expect(cardDeckStyles).toContain('@media (max-width: 767px)');
        expect(cardDeckStyles).toMatch(/\.list\s*{[^}]*flex-direction:\s*column;/s);
        expect(cardDeckStyles).toMatch(/\.deck\s*{[^}]*overflow:\s*visible;/s);
        expect(cardDeckStyles).toMatch(/\.footer\s*{[^}]*display:\s*none;/s);
    });
});
