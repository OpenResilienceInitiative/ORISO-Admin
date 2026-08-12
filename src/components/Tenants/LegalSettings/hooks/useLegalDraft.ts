import { useCallback, useEffect, useState } from 'react';
import { notification } from 'antd';
import { useTranslation } from 'react-i18next';
import {
    clearLegalDraft,
    LegalDraft,
    LegalDraftDocument,
    legalDraftKey,
    readLegalDraft,
    writeLegalDraft,
} from '../utils/legalDraftStorage';

export interface UseLegalDraftResult {
    /**
     * The draft as it was found in storage — deliberately NOT refreshed on save.
     * Callers use it to seed the editor and as part of the card's remount key, so
     * saving a draft never yanks the editor out from under the admin's cursor.
     */
    draft?: LegalDraft;
    /** Timestamp of the most recent save (loaded or just written). */
    savedAt?: string;
    /** A newer version was published after the draft was last saved. */
    isStale: boolean;
    saveDraft: (contentByLanguage: Record<string, string>) => void;
    /** Returns whether the draft is really gone — callers must not drop further state otherwise. */
    discardDraft: () => boolean;
}

/**
 * Device-local draft for one legal document, scoped by `<tenantId>:<opaque user id>`.
 *
 * Tenant-level legal content has no draft state in the backend (see
 * `legalDraftStorage`), so this is the stop-gap that stops admins from having to
 * choose between publishing an unfinished document and losing their work. It is
 * explicitly local: the UI that renders `savedAt` must say so.
 */
export const useLegalDraft = (
    document: LegalDraftDocument,
    scope: string | undefined,
    baseVersionId?: string,
): UseLegalDraftResult => {
    const { t } = useTranslation();
    const key = legalDraftKey(document, scope);
    const [draft, setDraft] = useState<LegalDraft | undefined>(() => readLegalDraft(key));
    const [savedAt, setSavedAt] = useState<string | undefined>(() => readLegalDraft(key)?.savedAt);
    // The version the draft was LAST saved against — tracked separately from `draft`,
    // which stays frozen on purpose. Re-saving a stale draft against the current
    // version has to clear the stale warning; reading it off the frozen record would
    // keep warning about a conflict the admin has just resolved.
    const [savedBaseVersionId, setSavedBaseVersionId] = useState<string | undefined>(
        () => readLegalDraft(key)?.baseVersionId,
    );

    // The scope is undefined until the opaque user id has loaded; pick the draft up then.
    useEffect(() => {
        const stored = readLegalDraft(key);
        setDraft(stored);
        setSavedAt(stored?.savedAt);
        setSavedBaseVersionId(stored?.baseVersionId);
    }, [key]);

    const saveDraft = useCallback(
        (contentByLanguage: Record<string, string>) => {
            if (!key) {
                return;
            }
            if (!writeLegalDraft(key, contentByLanguage, baseVersionId)) {
                // Quota exceeded or storage disabled: nothing was stored, so say so
                // instead of confirming a save the admin would rely on.
                notification.error({ message: t('legal.draft.saveError'), duration: 8 });
                return;
            }
            setSavedAt(readLegalDraft(key)?.savedAt);
            setSavedBaseVersionId(baseVersionId);
            notification.success({ message: t('legal.draft.saved'), duration: 4 });
        },
        [baseVersionId, key, t],
    );

    const discardDraft = useCallback(() => {
        if (!key) {
            // No scope yet: there is nothing stored to discard, and nothing to warn about.
            return true;
        }
        if (!clearLegalDraft(key)) {
            // The draft is still on disk — keep showing it rather than pretending it
            // is gone and resurrecting it on the next load.
            notification.error({ message: t('legal.draft.discardError'), duration: 8 });
            return false;
        }
        setDraft(undefined);
        setSavedAt(undefined);
        setSavedBaseVersionId(undefined);
        return true;
    }, [key, t]);

    const isStale = !!savedBaseVersionId && !!baseVersionId && savedBaseVersionId !== baseVersionId;

    return { draft, savedAt, isStale, saveDraft, discardDraft };
};
