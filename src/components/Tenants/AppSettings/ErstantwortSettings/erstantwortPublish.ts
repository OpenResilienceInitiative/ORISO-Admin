import { isEmptyHtml } from '../../LegalSettings/utils/legalContentLanguages';
import { buildTranslationMeta, metaKeyFor } from '../../LegalSettings/utils/translationMeta';
import { ERSTANTWORT_BAUSTEINE, type ErstantwortBausteinKey } from './erstantwortBausteine';
import type { ErstantwortContentMap } from './ErstantwortTextsCard';

/** Stored next to the Bausteine in `content`; a number, or absent for the platform default. */
export const ERSTANTWORT_DEADLINE_FIELD = 'erstantwortResponseDeadlineDays';

const META_SUFFIX = metaKeyFor('');

const ERSTANTWORT_KEYS = ERSTANTWORT_BAUSTEINE.map((baustein) => baustein.key);

/** Both German variants are the Träger's own voice, never a translation target (ADR-018 §8). */
const isGermanLanguage = (language: string): boolean => /^de(?:[@-]|$)/.test(language);

/** Active languages a publish may translate into: everything except German. */
export const translationTargetsFor = (activeLanguages: string[] | undefined): string[] =>
    [...new Set(activeLanguages ?? [])].filter((language) => !isGermanLanguage(language));

/** The non-empty texts of the Träger's own variant, keyed by Baustein — the one translation request. */
export const collectSourceTexts = (
    content: ErstantwortContentMap,
    sourceLanguage: string,
    onlyKeys: readonly string[] = ERSTANTWORT_KEYS,
): Record<string, string> => {
    const texts: Record<string, string> = {};
    ERSTANTWORT_KEYS.filter((key) => onlyKeys.includes(key)).forEach((key) => {
        const html = content[key]?.[sourceLanguage];
        if (!isEmptyHtml(html)) {
            texts[key] = html as string;
        }
    });
    return texts;
};

const sameText = (a: string | undefined, b: string | undefined): boolean =>
    (isEmptyHtml(a) ? '' : a) === (isEmptyHtml(b) ? '' : b);

/** The Bausteine whose text in the Träger's own variant differs from what is stored. */
export const changedBausteine = (
    content: ErstantwortContentMap,
    stored: ErstantwortContentMap,
    sourceLanguage: string,
): ErstantwortBausteinKey[] =>
    ERSTANTWORT_KEYS.filter((key) => !sameText(content[key]?.[sourceLanguage], stored[key]?.[sourceLanguage]));

/**
 * A stale translation must never outlive an edit of its source. For every changed Baustein only the
 * source variant survives; each other language (and its `__meta`) that exists is sent as "" so the
 * backend removes it (TenantService#311). Unchanged Bausteine keep their translations. If the Träger
 * then skips the translation, the source text is the only one left and readers fall back to it.
 */
export const purgeStaleTranslations = (
    content: ErstantwortContentMap,
    stored: ErstantwortContentMap,
    sourceLanguage: string,
): ErstantwortContentMap => {
    const result: ErstantwortContentMap = { ...content };
    changedBausteine(content, stored, sourceLanguage).forEach((key) => {
        const languages = new Set(
            [...Object.keys(stored[key] ?? {}), ...Object.keys(content[key] ?? {})].filter(
                (language) => !language.endsWith(META_SUFFIX) && language !== sourceLanguage,
            ),
        );
        const purged: Record<string, string> = { [sourceLanguage]: content[key]?.[sourceLanguage] ?? '' };
        languages.forEach((language) => {
            purged[language] = '';
            purged[metaKeyFor(language)] = '';
        });
        result[key] = purged;
    });
    return result;
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
