import { translateLegalTexts } from '../../api/tenant/translation';
import type { TranslateRequest, TranslateResponse } from '../../types/translation';
import { MODULE_SOURCE_LANGUAGE } from '../ConversationModules/conversationModule';
import { textsOf, translationStatus, type JourneyStep } from './journey';

/**
 * Machine translation as the Admin has it: one call translates many texts into many languages,
 * through POST /tenantadmin/translate with the OpenRouter or Mistral key stored in the global
 * settings. Errors arrive as TranslationApiError with the backend's error code.
 */
export type Translator = (request: TranslateRequest) => Promise<TranslateResponse>;

/** The real one. Only offer it where the admin may call it (a centre-only admin may not). */
export const adminTranslator: Translator = translateLegalTexts;

const hasText = (value: string | undefined) => !!value && value.replace(/<[^>]*>/g, '').trim() !== '';

/** One text into one language. */
export const translateText = async (
    translator: Translator,
    text: string,
    targetLanguage: string,
    sourceLanguage: string = MODULE_SOURCE_LANGUAGE,
): Promise<string> => {
    const response = await translator({ sourceLang: sourceLanguage, targetLangs: [targetLanguage], texts: { text } });
    return response.translations[targetLanguage]?.text ?? '';
};

/**
 * Fills every missing text of a step in every missing language with ONE call, and marks those
 * languages as machine-made. Texts a person wrote stay untouched.
 */
export const translateStepMissing = async (step: JourneyStep, translator: Translator): Promise<JourneyStep> => {
    const { missing } = translationStatus(step);
    if (missing.length === 0) return step;
    const next = structuredClone(step);
    const texts = textsOf(next);
    const request: Record<string, string> = {};
    texts.forEach((text, index) => {
        const source = text[MODULE_SOURCE_LANGUAGE];
        if (hasText(source)) request[`t${index}`] = source as string;
    });
    if (Object.keys(request).length === 0) return step;
    const response = await translator({
        sourceLang: MODULE_SOURCE_LANGUAGE,
        targetLangs: missing,
        texts: request,
    });
    const filled = new Set<string>();
    texts.forEach((text, index) => {
        missing.forEach((language) => {
            const translated = response.translations[language]?.[`t${index}`];
            if (translated && !hasText(text[language])) {
                // eslint-disable-next-line no-param-reassign -- `next` is our own deep copy
                text[language] = translated;
                filled.add(language);
            }
        });
    });
    return { ...next, machine: [...new Set([...(next.machine ?? []), ...filled])] };
};

/** Stands in for the service in stories and tests: marks the text instead of translating it. */
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

/**
 * Suggests further search terms in one language: everyday words people use for what the block is
 * about. Asks the configured AI provider with a short fixed prompt (ORISO-Admin#1562 proposes
 * `POST /tenantadmin/suggest-terms`); until that endpoint exists the Admin offers no suggestions.
 */
export type KeywordSuggester = (request: {
    language: string;
    title: string;
    about: string;
    existing: string[];
}) => Promise<string[]>;

/** The prompt the endpoint is meant to send, kept here so Admin and backend agree on it. */
export const SUGGEST_TERMS_PROMPT =
    'List up to 10 everyday words or short phrases that people writing in {language} use when they ' +
    'look for help with: "{title}" ({about}). No diagnoses, no slurs, no words already listed: ' +
    '{existing}. One per line.';

/**
 * Translates the German search terms of a block into the given languages in one call. Terms are
 * added, never replaced; each language keeps its own words too.
 */
export const translateKeywords = async (
    keywords: Partial<Record<string, string[]>>,
    targetLanguages: string[],
    translator: Translator,
): Promise<Partial<Record<string, string[]>>> => {
    const source = keywords[MODULE_SOURCE_LANGUAGE] ?? [];
    if (source.length === 0 || targetLanguages.length === 0) return keywords;
    const texts = Object.fromEntries(source.map((term, index) => [`k${index}`, term]));
    const response = await translator({ sourceLang: MODULE_SOURCE_LANGUAGE, targetLangs: targetLanguages, texts });
    const next = { ...keywords };
    targetLanguages.forEach((language) => {
        const current = next[language] ?? [];
        const added = Object.values(response.translations[language] ?? {})
            .map((term) => term.replace(/<[^>]*>/g, '').trim())
            .filter((term) => term && !current.some((existing) => existing.toLowerCase() === term.toLowerCase()));
        next[language] = [...current, ...new Set(added)];
    });
    return next;
};

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
