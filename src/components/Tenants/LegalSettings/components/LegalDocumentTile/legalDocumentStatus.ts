import type { TFunction } from 'i18next';

export interface LegalDocumentTileStatus {
    label: string;
    tone: 'neutral' | 'attention';
}

/** Where a legal document stands: live, still a draft, or not written yet. */
export type LegalDocumentState = 'published' | 'draft' | 'empty';

const STATE_KEYS: Record<LegalDocumentState, string> = {
    published: 'legal.status.published',
    draft: 'legal.status.draft',
    empty: 'legal.status.empty',
};

/** The chip of a folded tile: only a published document is plain, the other two ask for attention. */
export const legalDocumentStatus = (t: TFunction, state: LegalDocumentState): LegalDocumentTileStatus => ({
    label: t(STATE_KEYS[state]),
    tone: state === 'published' ? 'neutral' : 'attention',
});

/**
 * Imprint and privacy statement: the text on screen against the live text. An open draft conflict is a draft even
 * when the screen holds exactly the live text, because another saved draft exists that is not resolved yet. That
 * includes a browser draft and a server draft that nobody has chosen between.
 */
export const legalTextState = ({
    isPublished,
    differsFromPublished,
    hasConflict,
}: {
    isPublished: boolean;
    differsFromPublished: boolean;
    hasConflict: boolean;
}): LegalDocumentState => {
    if (hasConflict || differsFromPublished) return 'draft';
    return isPublished ? 'published' : 'empty';
};

/** Data processing agreement: a stored draft wins over the published versions, no version means still empty. */
export const dpaState = ({
    hasDraft,
    versionCount,
}: {
    hasDraft: boolean;
    versionCount: number;
}): LegalDocumentState => {
    if (hasDraft) return 'draft';
    return versionCount > 0 ? 'published' : 'empty';
};
