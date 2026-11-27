import type { KeywordSuggester, Translator } from './journeyTranslation';

/*
 * Stand-ins for the translation endpoint and the suggestion endpoint (ORISO-Admin#1562), for
 * stories and tests only. Never import this from production code.
 */

/** A few real words, so the stories show search terms as they would look; anything else is marked. */
const STORY_LEXICON: Record<string, Partial<Record<string, string>>> = {
    Schulden: { en: 'debt', fr: 'dettes', ru: 'долги', ti: 'ዕዳ', tr: 'borç' },
    Pfändung: { en: 'seizure', fr: 'saisie', ru: 'арест имущества', tr: 'haciz' },
    Gläubiger: { en: 'creditor', fr: 'créancier', ru: 'кредитор', tr: 'alacaklı' },
    Mahnung: { en: 'payment reminder', fr: 'relance', ru: 'напоминание об оплате', tr: 'ihtarname' },
    Inkasso: { en: 'debt collection', fr: 'recouvrement', ru: 'коллекторы', tr: 'tahsilat' },
    Miete: { en: 'rent', fr: 'loyer', ru: 'аренда', tr: 'kira' },
};

const storyTranslation = (text: string, language: string) =>
    language === 'de@informal' ? text : STORY_LEXICON[text]?.[language] ?? `${text} (${language})`;

export const fakeTranslator: Translator = async ({ targetLangs, texts }) => ({
    translations: Object.fromEntries(
        targetLangs.map((language) => [
            language,
            Object.fromEntries(Object.entries(texts).map(([key, text]) => [key, storyTranslation(text, language)])),
        ]),
    ),
    provider: 'story',
    model: 'story',
});

/** Stands in for the endpoint in stories and tests. */
export const fakeSuggester: KeywordSuggester = async ({ language, existing }) => {
    const pool: Record<string, string[]> = {
        de: ['Schulden', 'Inkasso', 'Mahnung', 'Pfändung', 'Kredit', 'Miete', 'Stromsperre', 'Gerichtsvollzieher'],
        en: ['debt', 'collection', 'overdue bill', 'bailiff', 'loan', 'rent arrears'],
        tr: ['borç', 'icra', 'kredi', 'kira borcu', 'haciz'],
    };
    return (pool[language] ?? [`${language}-1`, `${language}-2`, `${language}-3`]).filter(
        (term) => !existing.some((entry) => entry.toLowerCase() === term.toLowerCase()),
    );
};
