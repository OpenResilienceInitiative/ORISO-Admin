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

    // #259: items must respect --card-deck-item-min-width, not collapse to 0.
    it('honours the configured item minimum width (capped by the responsive max)', () => {
        const itemRule = cardDeckStyles.match(/\.item\s*{([^}]*)}/s)?.[1] ?? '';
        expect(itemRule).toMatch(
            /min-width:\s*min\(\s*var\(--card-deck-item-min-width,\s*320px\)\s*,\s*var\(--card-deck-item-max-width/s,
        );
        // The desktop item rule must not force the min-width to 0.
        expect(itemRule).not.toMatch(/min-width:\s*0/);
    });

    // #568: a growable deck item contributes its content max-content width
    // under the list's `min-width: max-content`, letting a wide editor toolbar
    // blow a card up to ~780px and push sibling cards off-screen.
    it('caps the item width so card content can never widen the deck', () => {
        const itemRule = cardDeckStyles.match(/\.item\s*{([^}]*)}/s)?.[1] ?? '';
        expect(itemRule).toMatch(
            /max-width:\s*min\(\s*var\(--card-deck-item-width,\s*392px\)\s*,\s*var\(--card-deck-item-max-width/s,
        );
    });

    it('releases the item width cap when the deck stacks vertically', () => {
        const mobileBlock = cardDeckStyles.match(/@media \(max-width: 767px\)\s*{(.*)}/s)?.[1] ?? '';
        expect(mobileBlock).toMatch(/\.item\s*{[^}]*max-width:\s*none;/s);
        // The .stacked block ends where the next top-level rule begins.
        const stackedBlock = cardDeckStyles.match(/\n\.stacked\s*{(.*?)\n}/s)?.[1] ?? '';
        expect(stackedBlock).toMatch(/\.list\s*{[^}]*flex-direction:\s*column/s);
        expect(stackedBlock).toMatch(/\.item\s*{[^}]*max-width:\s*none/s);
    });

    it('exposes the distance between cards as a deck token', () => {
        const listRule = cardDeckStyles.match(/\.list\s*{([^}]*)}/s)?.[1] ?? '';
        expect(listRule).toMatch(/gap:\s*var\(--card-deck-gap,\s*24px\)/);
    });
});
