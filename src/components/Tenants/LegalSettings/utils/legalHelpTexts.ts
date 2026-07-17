export type LegalHelpType = 'dpa' | 'privacy' | 'imprint';
export type LegalHelpRole = 'platform' | 'tenant' | 'agency';

export interface LegalHelpContext {
    /** No published/stored content exists yet for this legal text. */
    empty: boolean;
    /** The current user may look but not edit. */
    readOnly: boolean;
}

/**
 * Maps (legal text type × user role × content state) to the i18n key base of the
 * editor help texts (Figma Admin.ORISO 457-13255, "Description_Legal"). Each key
 * base has a `.text` (normal description) and a `.hint` (bold CTA tip).
 *
 * States the backend cannot express yet resolve to their closest neighbour:
 * tenant DPA signing (unsigned vs. signed falls back to read-only) and the
 * agency-owns-its-own-text variants (`agency.own` keys exist in the locale
 * files, ready to be wired once agency-level legal content lands).
 */
/** True when a stored legal content value (language map, HTML string, or nothing) has no visible text. */
export const isEmptyLegalContent = (value: unknown): boolean => {
    // Strip tags, then decode/normalize whitespace entities (&nbsp;, &#160;, &#xA0;)
    // and non-breaking / zero-width whitespace so "<p>&nbsp;</p>" counts as empty.
    const isEmptyHtml = (html: string) =>
        html
            .replace(/<[^>]*>/g, '')
            .replace(/&(?:nbsp|#160|#xa0);/gi, ' ')
            .replace(/[\u00A0\u200B]/g, '')
            .trim() === '';
    if (value == null) return true;
    if (typeof value === 'string') return isEmptyHtml(value);
    if (typeof value === 'object') {
        const entries = Object.entries(value as Record<string, unknown>)
            .filter(([key]) => !key.startsWith('__') && !key.includes('__meta'))
            .map(([, entry]) => entry);
        return entries.every((entry) => typeof entry !== 'string' || isEmptyHtml(entry));
    }
    return true;
};

export const resolveLegalHelpKey = (
    type: LegalHelpType,
    role: LegalHelpRole,
    { empty, readOnly }: LegalHelpContext,
): string => {
    let state: string;
    if (type === 'dpa') {
        if (role === 'platform') state = empty ? 'empty' : 'published';
        else if (role === 'tenant') state = readOnly ? 'signed' : 'unsigned';
        else state = 'published';
    } else if (role === 'platform') {
        state = empty ? 'empty' : 'published';
    } else if (role === 'tenant') {
        state = empty ? 'draft' : 'published';
    } else {
        state = readOnly ? 'inheritedReadOnly' : 'inherited';
    }
    return `legal.help.${type}.${role}.${state}`;
};
