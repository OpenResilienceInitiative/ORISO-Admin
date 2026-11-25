import { translateLegalTexts } from '../../api/tenant/translation';
import type { TranslateRequest, TranslateResponse } from '../../types/translation';
import { MODULE_SOURCE_LANGUAGE } from '../ConversationModules/conversationModule';
import { hasText, textEntries, translationStatus, type JourneyStep } from './journey';

/**
 * Machine translation as the Admin has it: one call translates many texts into many languages,
 * through POST /tenantadmin/translate with the OpenRouter or Mistral key stored in the global
 * settings. Errors arrive as TranslationApiError with the backend's error code.
 */
export type Translator = (request: TranslateRequest) => Promise<TranslateResponse>;

/** The real one. Only offer it where the admin may call it (a centre-only admin may not). */
export const adminTranslator: Translator = translateLegalTexts;

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
 * Machine texts for a step, addressed by the path of each field (see `textEntries`). Applied to
 * the step as it is when the answer arrives: a field that is gone is skipped, and a field is only
 * written while it still holds what it held when the request went out (`expected`, empty when not
 * given). So nothing typed, deleted or split in the meantime is overwritten.
 */
export interface TranslationFill {
    texts: { path: string; language: string; text: string; expected?: string }[];
}

export const applyTranslationFill = (step: JourneyStep, fill: TranslationFill): JourneyStep => {
    const next = structuredClone(step);
    const fields = new Map(textEntries(next).map((entry) => [entry.path, entry.text]));
    const written = new Set<string>();
    fill.texts.forEach(({ path, language, text, expected }) => {
        const field = fields.get(path);
        if (!field || !hasText(text)) return;
        const current = field[language] ?? '';
        if (expected === undefined ? hasText(current) : current !== expected) return;
        field[language] = text;
        written.add(language);
    });
    if (written.size === 0) return step;
    return { ...next, machine: [...new Set([...(next.machine ?? []), ...written])] };
};

/**
 * Asks for every missing text of a step in every missing language with ONE call. The answer is a
 * fill to apply to the step as it is then; texts a person wrote are never part of it.
 */
export const requestStepTranslation = async (step: JourneyStep, translator: Translator): Promise<TranslationFill> => {
    const { missing } = translationStatus(step);
    const entries = textEntries(step).filter((entry) => hasText(entry.text[MODULE_SOURCE_LANGUAGE]));
    if (missing.length === 0 || entries.length === 0) return { texts: [] };
    const response = await translator({
        sourceLang: MODULE_SOURCE_LANGUAGE,
        targetLangs: missing,
        texts: Object.fromEntries(
            entries.map((entry, index) => [`t${index}`, entry.text[MODULE_SOURCE_LANGUAGE] as string]),
        ),
    });
    return {
        texts: missing.flatMap((language) =>
            entries.flatMap((entry, index) => {
                const text = response.translations[language]?.[`t${index}`];
                return text && !hasText(entry.text[language]) ? [{ path: entry.path, language, text }] : [];
            }),
        ),
    };
};

/** Request and apply in one go, for a step nobody edits meanwhile (tests, the card's button). */
export const translateStepMissing = async (step: JourneyStep, translator: Translator): Promise<JourneyStep> =>
    applyTranslationFill(step, await requestStepTranslation(step, translator));

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
 * Translates the German search terms of a block into the given languages in one call. Returns the
 * terms per language; merge them into the block as it is then (`addKeywords`), never replace.
 */
export const translateKeywords = async (
    germanTerms: string[],
    targetLanguages: string[],
    translator: Translator,
): Promise<Partial<Record<string, string[]>>> => {
    if (germanTerms.length === 0 || targetLanguages.length === 0) return {};
    const texts = Object.fromEntries(germanTerms.map((term, index) => [`k${index}`, term]));
    const response = await translator({ sourceLang: MODULE_SOURCE_LANGUAGE, targetLangs: targetLanguages, texts });
    return Object.fromEntries(
        targetLanguages.map((language) => [
            language,
            Object.values(response.translations[language] ?? {})
                .map((term) => term.replace(/<[^>]*>/g, '').trim())
                .filter(Boolean),
        ]),
    );
};
