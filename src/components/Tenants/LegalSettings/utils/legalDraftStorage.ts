/**
 * Local (device-only) drafts for the legal editors.
 *
 * The tenant-level legal documents have no draft state in the backend: the DPA
 * endpoint stamps a new PUBLISHED version on every write, and imprint/privacy are
 * single content columns. Until server-side drafts exist, saving a draft keeps the
 * work in this browser so an admin can stop mid-text without either losing it or
 * being forced to publish an unfinished legal document.
 *
 * The scope must be built from the OPAQUE user id, never from a username or email —
 * same rule as the help-snackbar dismissal keys next door.
 */

export interface LegalDraft {
    /** The complete content map (language -> HTML) as it stood when saved. */
    content: Record<string, string>;
    /** ISO timestamp of the save, shown to the admin. */
    savedAt: string;
    /**
     * The published version the draft was written against (the DPA's activation date).
     * When a newer version has been published since, the UI warns instead of letting a
     * stale draft quietly overwrite a newer legal text.
     */
    baseVersionId?: string;
}

export type LegalDraftDocument = 'dpa' | 'imprint' | 'privacy';

const DRAFT_KEY_PREFIX = 'oriso-admin.legal.draft';

/** Storage key for one document in one tenant/user scope (`<tenantId>:<userId>`). */
export const legalDraftKey = (document: LegalDraftDocument, scope: string | undefined): string | undefined =>
    scope ? `${DRAFT_KEY_PREFIX}.${document}.${scope}` : undefined;

const isContentMap = (value: unknown): value is Record<string, unknown> =>
    !!value && typeof value === 'object' && !Array.isArray(value);

/** Reads the stored draft; anything unreadable or malformed is treated as "no draft". */
export const readLegalDraft = (key: string | undefined): LegalDraft | undefined => {
    if (!key) {
        return undefined;
    }
    let raw: string | null;
    try {
        raw = window.localStorage.getItem(key);
    } catch {
        // Private mode / storage disabled: behave as if no draft was ever saved.
        return undefined;
    }
    if (!raw) {
        return undefined;
    }
    try {
        const parsed = JSON.parse(raw);
        if (!isContentMap(parsed) || !isContentMap(parsed.content) || typeof parsed.savedAt !== 'string') {
            return undefined;
        }
        // Only string entries reach the editor — a stored non-string would render as "[object Object]".
        const content = Object.fromEntries(
            Object.entries(parsed.content).filter(([, html]) => typeof html === 'string'),
        ) as Record<string, string>;
        return {
            content,
            savedAt: parsed.savedAt,
            baseVersionId: typeof parsed.baseVersionId === 'string' ? parsed.baseVersionId : undefined,
        };
    } catch {
        return undefined;
    }
};

/** Stores the draft. A missing key (unknown user) writes nothing rather than a shared draft. */
export const writeLegalDraft = (
    key: string | undefined,
    content: Record<string, string>,
    baseVersionId?: string,
): void => {
    if (!key) {
        return;
    }
    const draft: LegalDraft = { content, savedAt: new Date().toISOString(), baseVersionId };
    try {
        window.localStorage.setItem(key, JSON.stringify(draft));
    } catch {
        // Quota exceeded / storage disabled: the draft is simply not kept.
    }
};

/** Removes the draft (discarded by the admin, or superseded by a successful publish). */
export const clearLegalDraft = (key: string | undefined): void => {
    if (!key) {
        return;
    }
    try {
        window.localStorage.removeItem(key);
    } catch {
        // Nothing to do — the draft stays until the browser clears it.
    }
};
