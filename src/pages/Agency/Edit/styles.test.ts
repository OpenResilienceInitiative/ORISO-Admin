import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const agencyEditStyles = readFileSync(resolve(__dirname, './styles.module.scss'), 'utf8');
const agencyEditSource = readFileSync(resolve(__dirname, './index.tsx'), 'utf8');

describe('agency creation card deck', () => {
    it('uses 420px cards with 32px between them', () => {
        const deck = agencyEditStyles.match(/\.createCardDeck\s*{([\s\S]*?)\n}/)?.[1] ?? '';
        expect(deck).toMatch(/--card-deck-item-min-width:\s*420px/);
        expect(deck).toMatch(/--card-deck-item-width:\s*420px/);
        expect(deck).toMatch(/--card-deck-gap:\s*32px/);
    });
});

// JOB1 / #862: the three legal editors on the agency "Rechtliches" tab must get
// the same usable width the platform admin sees (800px panel card, Figma
// 1261-48667) instead of the deck's 392px default — without Page .cardDeckItem
// flex-grow and without a min-width that overflows at tablet.
describe('Agency Edit legal card deck contract', () => {
    const rule = agencyEditStyles.match(/\.documentEditorItem\s*{([\s\S]*?)\n {4}}/)?.[1] ?? '';

    it('gives the legal editors the 800px panel-card width from tablet up', () => {
        expect(agencyEditStyles).toMatch(/@media \(min-width: 768px\)/);
        expect(rule).toMatch(/--card-deck-item-width:\s*var\(--admin-panel-card-width, 800px\)/);
    });

    it('caps that width by the page raster so the page never scrolls sideways', () => {
        expect(rule).toMatch(
            /--card-deck-item-max-width:\s*min\(\s*var\(--admin-panel-card-width, 800px\),\s*calc\(100vw - var\(--admin-sidebar-width, 128px\) - 2 \* var\(--admin-page-edge, 84px\)\)\s*\)/,
        );
    });

    // The tenant deck sets one and overflows the page at tablet widths; the
    // deck's own min(320px, max-width) floor is enough here.
    it('sets no item minimum that could outgrow the viewport', () => {
        expect(rule).not.toMatch(/--card-deck-item-min-width/);
    });

    it('applies the wider item only to DPA, imprint and privacy', () => {
        const deckItems = [...agencyEditSource.matchAll(/<CardDeck\.Item([^>]*)>([\s\S]*?)<\/CardDeck\.Item>/g)];
        const findItem = (content: string) => deckItems.find(([, , body]) => body.includes(content));
        const documentEditorClass = 'className={styles.documentEditorItem}';

        expect(findItem('<DataProcessingAgreementContainer')?.[1]).toContain(documentEditorClass);
        expect(findItem('field="imprint"')?.[1]).toContain(documentEditorClass);
        expect(findItem('field="privacy"')?.[1]).toContain(documentEditorClass);

        expect(findItem('<ResponsibleSettings')?.[1] ?? '').not.toContain(documentEditorClass);
        expect(findItem('<ContactSettings')?.[1] ?? '').not.toContain(documentEditorClass);
    });

    it('never lets a legal document deck item grow beyond its token width', () => {
        expect(agencyEditStyles).not.toMatch(/flex-grow/);
        expect(agencyEditSource).not.toMatch(/styles\.cardDeckItem/);
    });
});
