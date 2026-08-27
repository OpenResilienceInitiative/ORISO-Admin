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
        // Default is the 48px card raster from Figma 1285-80496.
        expect(listRule).toMatch(/gap:\s*var\(--card-deck-gap,\s*var\(--admin-card-gap,\s*48px\)\)/);
    });
});

// A deck of settings cards is a document, not a media carousel: dragging it
// sideways must come to rest where the reader let go instead of being tugged
// onto the next card edge — which is what kept two cards from being read side
// by side. Snapping was already off for the stacked and mobile variants, so the
// desktop scroller was the only surface that still pulled.
describe('CardDeck free horizontal scrolling', () => {
    it('leaves the scroller and its cards free of snap points', () => {
        const deckRule = cardDeckStyles.match(/\n\.deck\s*{([\s\S]*?)\n}/)?.[1] ?? '';
        const itemRule = cardDeckStyles.match(/\n\.item\s*{([\s\S]*?)\n}/)?.[1] ?? '';

        expect(deckRule).not.toMatch(/scroll-snap-type/);
        expect(itemRule).not.toMatch(/scroll-snap-align/);
    });

    // Deliberately file-wide: a snap axis re-armed under any selector — a new
    // variant, a breakpoint, a state class — brings the pull straight back.
    it('never re-arms scroll snapping in a deck variant or breakpoint', () => {
        expect(cardDeckStyles).not.toMatch(/scroll-snap/);
    });

    // Free must not become frozen: the cards still have to reach their full
    // range under pointer, wheel and touch.
    it('keeps the deck scrolling horizontally', () => {
        const deckRule = cardDeckStyles.match(/\n\.deck\s*{([\s\S]*?)\n}/)?.[1] ?? '';

        expect(deckRule).toMatch(/overflow-x:\s*auto/);
        expect(deckRule).toMatch(/touch-action:[^;]*pan-x/);
    });
});
