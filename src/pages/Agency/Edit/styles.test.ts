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

// #862: Agency legal document editors must use the same 800px desktop deck
// width as tenant LegalSettings — not Page .cardDeckItem { flex-grow: 1 }.
describe('Agency Edit legal card deck contract', () => {
    it('gives M3 document editor items their 800px desktop width', () => {
        const desktopRule = agencyEditStyles.match(/@media \(min-width:\s*768px\)\s*{([\s\S]*?)\n}/)?.[1] ?? '';
        const documentItemRule = desktopRule.match(/\.documentEditorItem\s*{([^}]*)}/s)?.[1] ?? '';

        expect(documentItemRule).toMatch(/--card-deck-item-min-width:\s*800px/);
        expect(documentItemRule).toMatch(/--card-deck-item-width:\s*800px/);
        expect(documentItemRule).toMatch(/--card-deck-item-max-width:\s*min\(800px,\s*calc\(100vw\s*-\s*176px\)\)/);
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
