import { useCallback, useState } from 'react';
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

interface LegalDraftState {
    /** The scope key this snapshot was read for — guards against cross-user leakage. */
    key: string | undefined;
    draft?: LegalDraft;
    savedAt?: string;
    savedBaseVersionId?: string;
}

const readState = (key: string | undefined): LegalDraftState => {
    const stored = readLegalDraft(key);
    return { key, draft: stored, savedAt: stored?.savedAt, savedBaseVersionId: stored?.baseVersionId };
};

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
    // Key, draft and save markers live in ONE state object so they can never
    // disagree: an effect would let the render right after a scope change still
    // return the previous scope's draft — i.e. one frame of another user's text.
    // `savedBaseVersionId` is tracked apart from the (deliberately frozen) draft
    // record: re-saving a stale draft against the current version has to clear the
    // stale warning, which reading it off the frozen record would not do.
    const [state, setState] = useState<LegalDraftState>(() => readState(key));
    // Render-phase adjustment for a changed scope — React's documented pattern for
    // derived state, and the only way to keep this synchronous.
    const current = state.key === key ? state : readState(key);
    if (current !== state) {
        setState(current);
    }
    const { draft, savedAt, savedBaseVersionId } = current;

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
            setState((previous) => ({
                ...previous,
                savedAt: readLegalDraft(key)?.savedAt,
                savedBaseVersionId: baseVersionId,
            }));
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
        setState({ key, draft: undefined, savedAt: undefined, savedBaseVersionId: undefined });
        return true;
    }, [key, t]);

    const isStale = !!savedBaseVersionId && !!baseVersionId && savedBaseVersionId !== baseVersionId;

    return { draft, savedAt, isStale, saveDraft, discardDraft };
};
