import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EditorStatusLine } from '../../../../FormPluginEditor/EditorStatusLine';

/** A server-draft state that waits for the admin: it is announced as a pop-up and kept as tile text. */
export type DraftDecisionKind = 'unavailable' | 'conflict' | 'collision';

export const draftDecisionKind = ({
    unavailable,
    conflict,
    collision,
}: {
    unavailable: boolean;
    conflict: boolean;
    collision: boolean;
}): DraftDecisionKind | undefined => {
    if (unavailable) return 'unavailable';
    if (conflict) return 'conflict';
    if (collision) return 'collision';
    return undefined;
};

/**
 * Keeps the decision pop-up closable without losing the decision: closing it hides only the
 * pop-up, the tile's quiet line stays and its button raises the pop-up again. When the state ends
 * and later returns, it is a new event and the pop-up shows again.
 */
export const useDraftDecision = (state: { unavailable: boolean; conflict: boolean; collision: boolean }) => {
    const kind = draftDecisionKind(state);
    const [closedKind, setClosedKind] = useState<DraftDecisionKind>();
    useEffect(() => {
        if (closedKind && closedKind !== kind) setClosedKind(undefined);
    }, [closedKind, kind]);
    return {
        kind,
        dismissed: !!kind && closedKind === kind,
        dismiss: () => setClosedKind(kind),
        reopen: () => setClosedKind(undefined),
    };
};

/** The open draft decision as plain text in the tile; the button raises the pop-up again once it was closed. */
export const TenantLegalDraftStatus = ({
    kind,
    dismissed,
    onReopen,
}: {
    kind?: DraftDecisionKind;
    dismissed: boolean;
    onReopen: () => void;
}) => {
    const { t } = useTranslation();
    if (!kind) return null;
    return (
        <EditorStatusLine
            data-testid="tenant-draft-status"
            tone={kind === 'unavailable' ? 'error' : 'default'}
            actions={
                dismissed
                    ? [
                          {
                              label: t(
                                  kind === 'unavailable'
                                      ? 'legal.serverDraft.status.openError'
                                      : 'legal.serverDraft.status.open',
                              ),
                              onClick: onReopen,
                          },
                      ]
                    : undefined
            }
        >
            {t(`legal.serverDraft.status.${kind}`)}
        </EditorStatusLine>
    );
};

export default TenantLegalDraftStatus;
