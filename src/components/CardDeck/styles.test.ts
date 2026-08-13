import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const cardDeckStyles = readFileSync(resolve(__dirname, './styles.module.scss'), 'utf8');

describe('CardDeck responsive contract', () => {
    it('stacks cards across smartphone widths', () => {
        expect(cardDeckStyles).toContain('@media (max-width: 767px)');
        expect(cardDeckStyles).toMatch(/\.list\s*{[^}]*flex-direction:\s*column;/s);
        expect(cardDeckStyles).toMatch(/\.deck\s*{[^}]*overflow:\s*visible;/s);
    });

    // The arrows moved into the sticky page header (Figma 1285-80496); down here
    // they overlapped the cards' own footer actions and toasts.
    it('owns no scroll footer of its own', () => {
        expect(cardDeckStyles).not.toContain('.footer');
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

    it('exposes the distance between cards as a deck token', () => {
        const listRule = cardDeckStyles.match(/\.list\s*{([^}]*)}/s)?.[1] ?? '';
        // Default is the 48px card raster from Figma 1285-80496.
        expect(listRule).toMatch(/gap:\s*var\(--card-deck-gap,\s*var\(--admin-card-gap,\s*48px\)\)/);
    });
});
