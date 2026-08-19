import { useCallback, useMemo, useState } from 'react';
import { LegalTextVersion } from '../../../../types/legalVersion';
import { parseLegalContentMap } from '../utils/legalContentLanguages';

export interface ViewedLegalVersion {
    /** Hand to `M3RichTextEditor.onViewVersionChange`. */
    onViewVersionChange: (versionId: string | null) => void;
    /** The archived version being looked at, if any. */
    viewedVersion?: LegalTextVersion;
    /** That version's consent map, or `undefined` while the draft is shown. */
    viewedConsent?: Record<string, string>;
    /** True while an archived version is on screen — nothing may be edited then. */
    isViewingVersion: boolean;
    /** Drops back to the editable draft (e.g. when the edited language changes). */
    reset: () => void;
}

/**
 * Keeps a card's non-body fields on the SAME version as the editor body.
 *
 * The editor owns which version it displays, but a data-protection policy is more
 * than its body: the consent sentence is a field of it (ADR-021 decision 4) and is
 * rendered outside the editor card. Without this mirror, looking back at March's
 * policy would show March's wording next to today's consent sentence — and let the
 * admin edit that sentence while apparently reading history.
 *
 * All three DPP-bearing surfaces (Träger, Beratungsstelle, Fachbereich) need it
 * identically, hence a hook rather than three copies.
 */
export const useViewedLegalVersion = (versions: LegalTextVersion[]): ViewedLegalVersion => {
    const [viewedVersionId, setViewedVersionId] = useState<string | null>(null);

    // The editor reports `EditorVersion.id`, which is the surrogate id as a string
    // (ORISO-AgencyService#256) — the version is resolved by that, never by a date.
    const viewedVersion = useMemo(
        () => (viewedVersionId ? versions.find((version) => String(version.id) === viewedVersionId) : undefined),
        [versions, viewedVersionId],
    );

    // `consentText` is `undefined` when the backend has no such field and `null`
    // when the version genuinely had no sentence; `parseLegalContentMap` maps both
    // to `{}`, which reads as "this version carried no consent wording" — the
    // honest answer for a look-back either way.
    const viewedConsent = useMemo(
        () => (viewedVersion ? parseLegalContentMap(viewedVersion.consentText) : undefined),
        [viewedVersion],
    );

    const reset = useCallback(() => setViewedVersionId(null), []);

    return {
        onViewVersionChange: setViewedVersionId,
        viewedVersion,
        viewedConsent,
        isViewingVersion: !!viewedVersion,
        reset,
    };
};
