import { listPlaceholders } from '../../../PlaceholderTemplate/placeholderTokens';

/**
 * The one token a consent sentence may not be published without (ADR-021
 * decision 2). A Träger text REPLACES the platform sentence, so nothing legally
 * guarantees the platform's mandatory disclosures survive except this technical
 * rule: without `{{legal_links}}` the help-seeker would tick a box with no way
 * to reach the documents being agreed to.
 */
export const MANDATORY_CONSENT_TOKEN = 'legal_links';

/** Whether a sentence carries the mandatory token (whitespace inside the braces is tolerated). */
export const hasMandatoryConsentToken = (text: string | undefined): boolean =>
    listPlaceholders(text ?? '').includes(`{{${MANDATORY_CONSENT_TOKEN}}}`);

/** Blank text, i.e. nothing authored at this level. */
export const isBlankConsentText = (text: string | undefined): boolean => !text || text.trim() === '';

/**
 * The languages whose authored consent sentence would be rejected on publish.
 *
 * The server validates this too (ADR-021 decision 2); mirroring it client-side
 * exists so the admin is told BEFORE the request instead of hitting a 400 with
 * a finished text on screen.
 */
export const consentPublicationBlockers = (consentByLanguage: Record<string, string> | undefined): string[] =>
    Object.entries(consentByLanguage ?? {})
        .filter(([, text]) => !hasMandatoryConsentToken(text))
        .map(([language]) => language)
        .sort();

/** Languages whose consent sentence is empty — the editor pre-fills the template, so this is a gap. */
export const blankConsentLanguages = (consentByLanguage: Record<string, string> | undefined): string[] =>
    Object.entries(consentByLanguage ?? {})
        .filter(([, text]) => isBlankConsentText(text))
        .map(([language]) => language)
        .sort();

/** One spot where a placeholder touches another placeholder or a word, as the reader would see it. */
export interface RunTogetherSpot {
    first: string;
    second: string;
}

const PLACEHOLDER = /\{\{\s*[\w.]+\s*\}\}/g;
const LETTER_WORD_AFTER = /^\p{L}[\p{L}\p{N}]*/u;
const LETTER_WORD_BEFORE = /[\p{L}\p{N}]*\p{L}$/u;
const normalisePlaceholder = (token: string) => token.replace(/\s+/g, '');

/**
 * The spots where a placeholder will run together with its neighbour once it is
 * filled in (#1255): another placeholder or a letter directly next to it, with
 * no space. `{{legal_links}}{{Thema}}{{Beratungsstelle}}` reached help-seekers
 * as "Datenschutzerklärung und ImpressumSchuldenAdvice center Lichteberg"
 * (ORISO-Frontend#1920). Punctuation next to a placeholder is fine. A warning,
 * never a publish blocker — the author may mean it.
 */
export const runTogetherPlaceholders = (text: string | undefined): RunTogetherSpot[] => {
    const source = text ?? '';
    const tokens = Array.from(source.matchAll(PLACEHOLDER));
    const spots = new Map<string, RunTogetherSpot>();
    const add = (first: string, second: string) => spots.set(`${first}\u0000${second}`, { first, second });

    tokens.forEach((match, index) => {
        const start = match.index ?? 0;
        const end = start + match[0].length;
        const token = normalisePlaceholder(match[0]);
        const wordBefore = LETTER_WORD_BEFORE.exec(source.slice(0, start));
        if (wordBefore) add(wordBefore[0], token);
        const next = tokens[index + 1];
        if (next?.index === end) {
            add(token, normalisePlaceholder(next[0]));
            return;
        }
        const wordAfter = LETTER_WORD_AFTER.exec(source.slice(end));
        if (wordAfter) add(token, wordAfter[0]);
    });

    return Array.from(spots.values());
};

/** Convenience predicate for the publish action. */
export const canPublishConsentText = (consentByLanguage: Record<string, string> | undefined): boolean =>
    consentPublicationBlockers(consentByLanguage).length === 0;
