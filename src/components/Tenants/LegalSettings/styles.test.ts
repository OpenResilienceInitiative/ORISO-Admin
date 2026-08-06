import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const legalSettingsStyles = readFileSync(resolve(__dirname, './styles.module.scss'), 'utf8');
const legalSettingsSource = readFileSync(resolve(__dirname, './index.tsx'), 'utf8');

// #605: #582 made every legal card compact. Only the settings card belongs to
// that contract; the three M3 document editors use their Figma desktop width.
describe('LegalSettings card deck contract', () => {
    it('keeps the default legal settings card compact', () => {
        const cardDeckRule = legalSettingsStyles.match(/\.cardDeck\s*{([^}]*)}/s)?.[1] ?? '';
        expect(cardDeckRule).toMatch(/--card-deck-item-width:\s*425px/);
        expect(cardDeckRule).toMatch(/--card-deck-item-max-width:\s*425px/);
    });

    it('gives M3 document editor items their 800px desktop width', () => {
        const desktopRule = legalSettingsStyles.match(/@media \(min-width:\s*768px\)\s*{([\s\S]*?)\n}/)?.[1] ?? '';
        const documentItemRule = desktopRule.match(/\.documentEditorItem\s*{([^}]*)}/s)?.[1] ?? '';

        expect(documentItemRule).toMatch(/--card-deck-item-min-width:\s*800px/);
        expect(documentItemRule).toMatch(/--card-deck-item-width:\s*800px/);
        expect(documentItemRule).toMatch(/--card-deck-item-max-width:\s*min\(800px,\s*calc\(100vw\s*-\s*176px\)\)/);
    });

    it('applies the wider item only to DPA, imprint and privacy', () => {
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
