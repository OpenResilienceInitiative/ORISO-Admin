/**
 * Machine-translation metadata inside the legal language maps. Convention (TenantService
 * PR #55): a translated language `en` gets a sibling key `en__meta` whose value is a JSON
 * string like `{"mt":true,"src":"de","at":"<ISO>"}`. A manual edit+save of that language
 * clears the meta server-side — the UI only resends stored meta unchanged for untouched
 * languages (the merge util passes unknown keys through) and writes fresh meta for
 * languages it just machine-translated.
 */

/** v1 source ("Rechtssprache") of all legal texts. A per-document picker is a later package. */
export const LEGAL_SOURCE_LANGUAGE = 'de';

/** The field key used when translating a whole legal card (one text per card). */
export const LEGAL_TRANSLATION_FIELD_KEY = 'content';

export interface LegalTranslationMeta {
    /** true when the language version was machine-translated. */
    mt?: boolean;
    /** Source language the translation was made from. */
    src?: string;
    /** ISO timestamp of the translation. */
    at?: string;
}

const META_KEY_SUFFIX = '__meta';

/** The map key that stores the metadata of one language (`en` -> `en__meta`). */
export const metaKeyFor = (language: string): string => `${language}${META_KEY_SUFFIX}`;

/** Parses the metadata of one language out of a content map; null when absent/invalid. */
export const getTranslationMeta = (
    contentMap: Record<string, string> | undefined,
    language: string,
): LegalTranslationMeta | null => {
    const raw = contentMap?.[metaKeyFor(language)];
    if (!raw) {
        return null;
    }
    try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            return parsed as LegalTranslationMeta;
        }
    } catch {
        // Opaque/legacy value — treat as "no usable metadata".
    }
    return null;
};

/** true when the stored language version is flagged as machine-translated. */
export const isMachineTranslated = (contentMap: Record<string, string> | undefined, language: string): boolean =>
    getTranslationMeta(contentMap, language)?.mt === true;

/** Serialises fresh metadata for a language that was just machine-translated. */
export const buildTranslationMeta = (sourceLanguage: string, at: string = new Date().toISOString()): string =>
    JSON.stringify({ mt: true, src: sourceLanguage, at });
