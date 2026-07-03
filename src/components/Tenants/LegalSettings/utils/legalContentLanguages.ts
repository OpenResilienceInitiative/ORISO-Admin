/**
 * Helpers for the multilingual legal content maps (language -> HTML) stored by the
 * DPA and department data privacy endpoints. The editing rule is: always submit the
 * COMPLETE map — start from the loaded map, overwrite only the languages the admin
 * actually edited, and never drop keys we do not render (unknown languages or
 * metadata-suffixed keys such as `de__meta` pass through untouched).
 */

/** HTML values TipTap emits for "nothing written". */
const isEmptyHtml = (html: string | undefined): boolean => !html || html === '<p></p>';

/**
 * Keys that we offer for editing: plain language codes like `de`, `en` or `de-CH`.
 * Everything else (e.g. `de__meta`) is treated as opaque metadata and passed through.
 */
export const isEditableLanguageKey = (key: string): boolean => /^[a-z]{2}(-[a-z]{2})?$/i.test(key);

/**
 * Parses the stored content into a language -> HTML map.
 * Legacy plain (non-JSON) content is exposed under `de` so it stays editable.
 */
export const parseLegalContentMap = (raw: string | null | undefined): Record<string, string> => {
    if (!raw) {
        return {};
    }
    try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            return Object.fromEntries(
                Object.entries(parsed).map(([key, value]) => [key, typeof value === 'string' ? value : '']),
            );
        }
    } catch {
        // Not JSON — fall through to the legacy plain-content handling.
    }
    return { de: raw };
};

/** Returns the HTML of one language for display (active language, else first entry). */
export const pickLegalContentLanguage = (raw: string | null | undefined, language: string): string => {
    const map = parseLegalContentMap(raw);
    return map[language] ?? Object.values(map)[0] ?? '';
};

/**
 * The languages offered in the editor: the tenant's active languages plus any plain
 * language keys already present in the stored content (so no stored text is hidden).
 */
export const getEditableLanguages = (
    activeLanguages: string[] | undefined,
    contentMap: Record<string, string>,
): string[] => {
    const languages = activeLanguages?.length ? [...activeLanguages] : ['de'];
    Object.keys(contentMap)
        .filter((key) => isEditableLanguageKey(key) && !languages.includes(key))
        .forEach((key) => languages.push(key));
    return languages;
};

/**
 * Builds the complete map to submit: loaded content first, edited languages on top.
 * Languages that were never stored and stayed empty are not added; languages that
 * existed and were cleared stay in the map (as an intentional edit).
 */
export const mergeLegalContentMap = (
    loaded: Record<string, string>,
    edits: Record<string, string>,
): Record<string, string> => {
    const merged: Record<string, string> = { ...loaded };
    Object.entries(edits).forEach(([language, html]) => {
        if (isEmptyHtml(html) && !(language in loaded)) {
            return;
        }
        merged[language] = isEmptyHtml(html) ? '' : html;
    });
    return merged;
};
