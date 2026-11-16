import { isEmptyHtml } from '../../../LegalSettings/utils/legalContentLanguages';
import { buildTranslationMeta, metaKeyFor } from '../../../LegalSettings/utils/translationMeta';

/**
 * The platform level of the Erstantwort chain (ADR-018 §6): Beratungsstelle → Träger → platform
 * admin → built-in Caritas default. The platform admin rewords these three Bausteine; their ids are
 * the ones the UserService payload uses. "Who reads along" is absent on purpose: the platform
 * cannot know who reads along at a given centre (ORISO-UserService#1565).
 */
export const PLATFORM_GREETING_KEYS = ['greeting', 'closing', 'emergencyNumbers'] as const;
export type PlatformGreetingKey = (typeof PLATFORM_GREETING_KEYS)[number];

/** Every install ships these seven language versions; the platform carries both German variants. */
export const PLATFORM_LANGUAGES = ['de', 'de@informal', 'en', 'fr', 'ru', 'tr', 'ti'] as const;

/** The formal German text is the source; the informal variant is written by hand, never translated. */
export const PLATFORM_SOURCE_LANGUAGE = 'de';
export const PLATFORM_TRANSLATION_TARGETS = PLATFORM_LANGUAGES.filter((language) => !language.startsWith('de'));

export type PlatformTextMap = Partial<Record<PlatformGreetingKey, Record<string, string>>>;

const META_SUFFIX = metaKeyFor('');
const isGerman = (language: string) => language === 'de' || language.startsWith('de@');
const normalise = (html: string | undefined) => (isEmptyHtml(html) ? '' : html ?? '');

export const changedPlatformKeys = (content: PlatformTextMap, stored: PlatformTextMap): PlatformGreetingKey[] =>
    PLATFORM_GREETING_KEYS.filter(
        (key) =>
            normalise(content[key]?.[PLATFORM_SOURCE_LANGUAGE]) !== normalise(stored[key]?.[PLATFORM_SOURCE_LANGUAGE]),
    );

/** The non-empty formal German texts of the given Bausteine: the one translation request. */
export const collectPlatformSourceTexts = (
    content: PlatformTextMap,
    keys: readonly PlatformGreetingKey[] = PLATFORM_GREETING_KEYS,
): Record<string, string> => {
    const texts: Record<string, string> = {};
    keys.forEach((key) => {
        const html = content[key]?.[PLATFORM_SOURCE_LANGUAGE];
        if (!isEmptyHtml(html)) texts[key] = html as string;
    });
    return texts;
};

/**
 * A translation must not outlive an edit of its source: for every changed Baustein each
 * non-German language (and its marker) is sent as "", so readers of that language get the Caritas
 * default in their language until a new translation is published.
 */
export const purgeStalePlatformTranslations = (content: PlatformTextMap, stored: PlatformTextMap): PlatformTextMap => {
    const result: PlatformTextMap = { ...content };
    changedPlatformKeys(content, stored).forEach((key) => {
        const merged: Record<string, string> = { ...stored[key], ...content[key] };
        Object.keys(merged)
            .filter((language) => !language.endsWith(META_SUFFIX) && !isGerman(language))
            .forEach((language) => {
                merged[language] = '';
                if (metaKeyFor(language) in merged) merged[metaKeyFor(language)] = '';
            });
        result[key] = merged;
    });
    return result;
};

export const applyPlatformTranslations = (
    content: PlatformTextMap,
    translations: Record<string, Record<string, string>>,
    at: string,
): PlatformTextMap => {
    const result: PlatformTextMap = { ...content };
    Object.entries(translations).forEach(([language, texts]) => {
        PLATFORM_GREETING_KEYS.forEach((key) => {
            const html = texts?.[key];
            if (isEmptyHtml(html)) return;
            result[key] = {
                ...result[key],
                [language]: html as string,
                [metaKeyFor(language)]: buildTranslationMeta(PLATFORM_SOURCE_LANGUAGE, at),
            };
        });
    });
    return result;
};

/** The PUT body: each existing map in full; emptied texts travel as "" and take their marker along. */
export const buildPlatformPayload = (content: PlatformTextMap): PlatformTextMap => {
    const payload: PlatformTextMap = {};
    PLATFORM_GREETING_KEYS.forEach((key) => {
        const map = content[key];
        if (!map) return;
        const result: Record<string, string> = {};
        Object.entries(map).forEach(([language, value]) => {
            if (language.endsWith(META_SUFFIX)) return;
            result[language] = normalise(value);
            const meta = map[metaKeyFor(language)];
            if (meta !== undefined) result[metaKeyFor(language)] = result[language] === '' ? '' : meta;
        });
        Object.keys(map)
            .filter((k) => k.endsWith(META_SUFFIX) && !(k.slice(0, -META_SUFFIX.length) in map))
            .forEach((k) => {
                result[k] = '';
            });
        payload[key] = result;
    });
    return payload;
};

/** Languages of one Baustein without own text — there the Caritas default applies. */
export const languagesWithoutText = (map: Record<string, string> | undefined): string[] =>
    PLATFORM_LANGUAGES.filter((language) => isEmptyHtml(map?.[language]));
