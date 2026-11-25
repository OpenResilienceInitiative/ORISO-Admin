import { useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { EditorJumpContext } from './EditorJumpContext';
import { Notify, type MessageAction, type MessageSeverity, type NotifyProps } from '../Notify';

export type EditorHintSnackbarTone = 'blocker' | 'success' | 'error';

export type EditorHintSnackbarProps = {
    text: React.ReactNode;
    /** `blocker` (default) = info, "you cannot do X yet"; `success` = "X happened"; `error` = "this did not work". */
    tone?: EditorHintSnackbarTone;
    /** Kept so existing call sites compile; compact and long are one design now. */
    layout?: 'compact' | 'long';
    /** Hide for this session (the close button). */
    onClose: () => void;
    /**
     * The text action. Defaults to hiding permanently ("nicht mehr anzeigen", the caller
     * persists the choice); a caller with a different action names it via `actionLabel`.
     * Without a handler there is no action — only the close button.
     */
    onDismiss?: () => void;
    actionLabel?: string;
    actionDisabled?: boolean;
    /** Optional second action, e.g. preview alongside "do not show again". */
    secondaryAction?: { label: string; onClick: () => void; disabled?: boolean };
    /** Kept so existing call sites compile; the close control takes its name from the shared snackbar. */
    closeLabel?: string;
    /** Short line saying what the pop-up is about. Default: legal texts, where the editor lives. */
    title?: string;
    /**
     * Takes the person to the field or tile the notice is about ("Ansehen"). Default inside an editor:
     * the editor's heading. `false` = nothing to go to.
     */
    jump?: NotifyProps['jump'];
    /** `data-testid` of the pop-up, for tests. */
    testId?: string;
};

const SEVERITY: Record<EditorHintSnackbarTone, MessageSeverity> = {
    blocker: 'info',
    success: 'success',
    error: 'error',
};

/**
 * Editor notice. It is a pop-up on the shared snackbar channel (one place, bottom of the screen),
 * never a box inside the editor: the component renders nothing in the layout. Name kept for the
 * many call sites and the "do not show again" persistence they own.
 */
export const EditorHintSnackbar = ({
    text,
    tone = 'blocker',
    onDismiss,
    onClose,
    actionLabel,
    actionDisabled = false,
    secondaryAction,
    title,
    jump,
    testId,
}: EditorHintSnackbarProps) => {
    const { t } = useTranslation();
    const editorJump = useContext(EditorJumpContext);
    const actions: MessageAction[] = [];
    if (secondaryAction) actions.push(secondaryAction);
    if (onDismiss) {
        actions.push({
            label: actionLabel ?? t('legal.help.snackbar.dismiss'),
            onClick: onDismiss,
            disabled: actionDisabled,
        });
    }
    return (
        <Notify
            title={title ?? t('notify.title.legal')}
            jump={jump ?? editorJump}
            testId={testId}
            severity={SEVERITY[tone]}
            onClose={onClose}
            actions={
                actions.length ? (actions.slice(0, 2) as [MessageAction] | [MessageAction, MessageAction]) : undefined
            }
        >
            {text}
        </Notify>
    );
};

export default EditorHintSnackbar;
