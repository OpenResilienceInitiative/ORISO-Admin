import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EditorStatusLine } from '../../../../FormPluginEditor/EditorStatusLine';
import { HintText } from '../../../../HintText';
import { Notify, type NotifyProps } from '../../../../Notify';

interface LegalDraftStateProps {
    /** ISO timestamp of the last save; without it there is nothing to announce. */
    savedAt?: string;
    /** A newer version has been published since the draft was saved. */
    stale?: boolean;
}

/**
 * Whether the pop-up of the device-local draft was closed. The state is the tile's, not the
 * pop-up's: closing the pop-up must not lose it, the tile keeps a quiet line with a button that
 * raises the pop-up again. A new draft (other save time) or a newly stale draft asks again.
 */
export const useLegalDraftNoticeState = ({ savedAt, stale }: LegalDraftStateProps) => {
    const signature = savedAt ? `${savedAt}|${stale ? 'stale' : 'fresh'}` : undefined;
    const [closedSignature, setClosedSignature] = useState<string>();
    useEffect(() => {
        if (!signature) setClosedSignature(undefined);
    }, [signature]);
    return {
        dismissed: !!signature && closedSignature === signature,
        dismiss: () => setClosedSignature(signature),
        reopen: () => setClosedSignature(undefined),
    };
};

const useSavedAtLabel = (savedAt: string | undefined) => {
    const { i18n } = useTranslation();
    if (!savedAt) return undefined;
    const parsed = new Date(savedAt);
    return Number.isNaN(parsed.getTime())
        ? savedAt
        : parsed.toLocaleString(i18n?.language, { dateStyle: 'medium', timeStyle: 'short' });
};

interface LegalDraftNoticeProps extends LegalDraftStateProps {
    onDiscard: () => void;
    /** The person closed the pop-up; the tile's quiet line (`LegalDraftStatus`) keeps the state. */
    dismissed?: boolean;
    onDismiss?: () => void;
    /** Takes the person to the editor ("Ansehen"). Default: the element this is rendered in. */
    jump?: NotifyProps['jump'];
}

/**
 * Tells the admin that the editor is showing a locally stored draft rather than the published
 * text, as a pop-up on the shared channel (never a box in the page, Frank 2026-11-07). The "this
 * device only" wording is not decoration: the draft lives in localStorage, so a colleague - or
 * the same admin on another machine - sees the published text, not this.
 */
export const LegalDraftNotice = ({
    savedAt,
    stale,
    onDiscard,
    dismissed = false,
    onDismiss,
    jump,
}: LegalDraftNoticeProps) => {
    const { t } = useTranslation();
    const savedAtLabel = useSavedAtLabel(savedAt);
    if (!savedAt || dismissed) {
        return null;
    }
    return (
        <Notify
            testId="legal-draft-notice"
            severity={stale ? 'warning' : 'info'}
            title={t('legal.draft.notice.title')}
            jump={jump}
            actions={[{ label: t('legal.draft.discard'), onClick: onDiscard }]}
            onClose={onDismiss}
        >
            {t('legal.draft.notice.description', { savedAt: savedAtLabel })}
            {stale ? ` ${t('legal.draft.notice.stale')}` : ''}
        </Notify>
    );
};

/**
 * The same state as plain text inside the tile (the pop-up is the event, this is the state): the
 * draft is device-local, and when a newer version exists, that publishing it overwrites that one.
 */
export const LegalDraftStatus = ({
    savedAt,
    stale,
    onDiscard,
    dismissed = false,
    onReopen,
    inset = false,
}: LegalDraftStateProps & {
    onDiscard: () => void;
    dismissed?: boolean;
    onReopen?: () => void;
    /** Align with the editor's help text (inside the tile header); off when the slot already pads. */
    inset?: boolean;
}) => {
    const { t } = useTranslation();
    const savedAtLabel = useSavedAtLabel(savedAt);
    if (!savedAt) {
        return null;
    }
    const actions = [{ label: t('legal.draft.discard'), onClick: onDiscard }];
    if (dismissed && onReopen) actions.push({ label: t('legal.draft.notice.show'), onClick: onReopen });
    const Line = inset ? EditorStatusLine : HintText;
    return (
        <Line data-testid="legal-draft-status" tone={stale ? 'error' : 'default'} actions={actions}>
            {t('legal.draft.status', { savedAt: savedAtLabel })}
            {stale ? ` ${t('legal.draft.notice.stale')}` : ''}
        </Line>
    );
};

export default LegalDraftNotice;
