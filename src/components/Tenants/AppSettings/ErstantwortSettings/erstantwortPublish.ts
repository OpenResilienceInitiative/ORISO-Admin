import { isEmptyHtml } from '../../LegalSettings/utils/legalContentLanguages';
import { buildTranslationMeta, metaKeyFor } from '../../LegalSettings/utils/translationMeta';
import { ERSTANTWORT_BAUSTEINE } from './erstantwortBausteine';
import type { ErstantwortContentMap } from './ErstantwortTextsCard';

/** Stored next to the Bausteine in `content`; a number, or absent for the platform default. */
export const ERSTANTWORT_DEADLINE_FIELD = 'erstantwortResponseDeadlineDays';

const ERSTANTWORT_KEYS = ERSTANTWORT_BAUSTEINE.map((baustein) => baustein.key);

/** Both German variants are the Träger's own voice, never a translation target (ADR-018 §8). */
const isGermanLanguage = (language: string): boolean => /^de(?:[@-]|$)/.test(language);

/** Active languages a publish may translate into: everything except German. */
export const translationTargetsFor = (activeLanguages: string[] | undefined): string[] =>
    [...new Set(activeLanguages ?? [])].filter((language) => !isGermanLanguage(language));

/** The non-empty texts of the Träger's own variant, keyed by Baustein — the one translation request. */
export const collectSourceTexts = (content: ErstantwortContentMap, sourceLanguage: string): Record<string, string> => {
    const texts: Record<string, string> = {};
    ERSTANTWORT_KEYS.forEach((key) => {
        const html = content[key]?.[sourceLanguage];
        if (!isEmptyHtml(html)) {
            texts[key] = html as string;
        }
    });
    return texts;
};

/**
 * Adds machine translations to the Bausteine. Each translated language gets a `<lang>__meta`
 * sibling (the legal-text convention), so the advice seeker's app and the next editor can tell
 * a machine text from a Träger's own one. Empty translations are dropped, not stored as blanks.
 */
export const applyTranslations = (
    content: ErstantwortContentMap,
    translations: Record<string, Record<string, string>>,
    sourceLanguage: string,
    at: string,
): ErstantwortContentMap => {
    const result: ErstantwortContentMap = { ...content };
    Object.entries(translations).forEach(([language, texts]) => {
        ERSTANTWORT_KEYS.forEach((key) => {
            const html = texts?.[key];
            if (isEmptyHtml(html)) {
                return;
            }
            result[key] = {
                ...result[key],
                [language]: html as string,
                [metaKeyFor(language)]: buildTranslationMeta(sourceLanguage, at),
            };
        });
    });
    return result;
};

const META_SUFFIX = metaKeyFor('');

/** A blank text is sent as "" so the backend removes that language; it never omits the key. */
const normaliseMap = (map: Record<string, string>): Record<string, string> => {
    const result: Record<string, string> = {};
    Object.entries(map).forEach(([language, value]) => {
        if (language.endsWith(META_SUFFIX)) {
            return;
        }
        result[language] = isEmptyHtml(value) ? '' : value;
        const meta = map[metaKeyFor(language)];
        if (meta !== undefined) {
            result[metaKeyFor(language)] = result[language] === '' ? '' : meta;
        }
    });
    return result;
};

/**
 * The `content` part of the publish PUT (TenantService#311 contract): every Baustein map that
 * exists, as the FULL map, because a non-empty map replaces the stored one. Emptied texts travel
 * as "". The deadline is included only when the Träger changed it (`undefined` = untouched);
 * a cleared deadline (`null`) is sent as 0, which makes the platform default apply.
 */
export const buildErstantwortContentPayload = (
    content: ErstantwortContentMap,
    deadlineDays: number | null | undefined,
): Record<string, unknown> => {
    const payload: Record<string, unknown> = {};
    ERSTANTWORT_KEYS.forEach((key) => {
        if (content[key]) {
            payload[key] = normaliseMap(content[key] as Record<string, string>);
        }
    });
    if (deadlineDays !== undefined) {
        payload[ERSTANTWORT_DEADLINE_FIELD] = deadlineDays ?? 0;
    }
    return payload;
};
