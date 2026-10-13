import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const legalSettingsStyles = readFileSync(resolve(__dirname, './styles.module.scss'), 'utf8');
const legalSettingsSource = readFileSync(resolve(__dirname, './index.tsx'), 'utf8');

// #1195: the legal cards wrap by width. The #605 contract (compact 425px settings card, 800px
// editors) is replaced: no legal card carries a fixed pixel width any more.
describe('LegalSettings card deck contract', () => {
    it('lets the cards wrap instead of scrolling sideways', () => {
        expect(legalSettingsSource).toMatch(/<CardDeck[\s\S]*?layout="wrap"/);
    });

    it('fixes no pixel width on a legal card', () => {
        expect(legalSettingsStyles).not.toMatch(/--card-deck-item-(min-|max-)?width/);
        expect(legalSettingsStyles).not.toMatch(/^\s*(min-|max-)?width:\s*\d+px/m);
    });

    it('gives a card with an open template comparison the whole row', () => {
        const compareRule = legalSettingsStyles.match(/\.documentEditorItem:has\([^)]*\)\s*{([^}]*)}/s)?.[1] ?? '';
        expect(compareRule).toMatch(/grid-column:\s*1\s*\/\s*-1/);
    });

    it('marks DPA, imprint and privacy as document editor items', () => {
        const deckItems = [...legalSettingsSource.matchAll(/<CardDeck\.Item([^>]*)>([\s\S]*?)<\/CardDeck\.Item>/g)];
        const findItem = (content: string) => deckItems.find(([, , body]) => body.includes(content));
        const documentEditorClass = 'className={styles.documentEditorItem}';
        const privacyEditor = legalSettingsSource.match(/const LegalTextElement = \(([\s\S]*?)\n\s{4}\);/)?.[1] ?? '';

        expect(findItem('<DataProcessingAgreementContainer')?.[1]).toContain(documentEditorClass);
        expect(findItem('legalType="imprint"')?.[1]).toContain(documentEditorClass);
        expect(privacyEditor).toContain("fieldName={['content', 'privacy']}");
        expect(privacyEditor).toContain('legalType="privacy"');
        expect(findItem('{LegalTextElement}')?.[1]).toContain(documentEditorClass);

        const compactSettingsItem = findItem('<CardEditable');
        expect(compactSettingsItem?.[1]).not.toContain(documentEditorClass);
        expect(legalSettingsSource).toMatch(/multitenancyWithSingleDomainEnabled[\s\S]*?<CardDeck\.Item>/);
    });

    // Deliberately file-wide: any grow rule on this page's deck items would
    // reintroduce the max-content blow-up, whatever class it hides behind.
    it('never lets a deck item grow beyond its token width', () => {
        expect(legalSettingsStyles).not.toMatch(/flex-grow/);
    });
});
