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
    /** A newer version was published after this draft was saved. */
    isStale: boolean;
    saveDraft: (contentByLanguage: Record<string, string>) => void;
    discardDraft: () => void;
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

    // The scope is undefined until the opaque user id has loaded; pick the draft up then.
    useEffect(() => {
        const stored = readLegalDraft(key);
        setDraft(stored);
        setSavedAt(stored?.savedAt);
    }, [key]);

    const saveDraft = useCallback(
        (contentByLanguage: Record<string, string>) => {
            if (!key) {
                return;
            }
            writeLegalDraft(key, contentByLanguage, baseVersionId);
            setSavedAt(readLegalDraft(key)?.savedAt);
            notification.success({ message: t('legal.draft.saved'), duration: 4 });
        },
        [baseVersionId, key, t],
    );

    const discardDraft = useCallback(() => {
        clearLegalDraft(key);
        setDraft(undefined);
        setSavedAt(undefined);
    }, [key]);

    const isStale = !!draft?.baseVersionId && !!baseVersionId && draft.baseVersionId !== baseVersionId;

    return { draft, savedAt, isStale, saveDraft, discardDraft };
};
