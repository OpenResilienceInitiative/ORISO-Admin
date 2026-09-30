import { Check, Close } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { ReactComponent as FigmaCloseIcon } from '../../resources/img/svg/oriso/snackbar_close_24px.svg';
import styles from './M3RichTextEditor.module.scss';

export type EditorHintSnackbarTone = 'blocker' | 'success' | 'error';

export type EditorHintSnackbarProps = {
    text: React.ReactNode;
    /**
     * `blocker` (default) is the dark inverse snackbar for "you cannot do X yet".
     * `success` is the blue secondary-container variant for "X happened" — same
     * shell, confirming rather than blocking (Figma Admin.ORISO 1261-51137).
     * `error` is the M3 error-container variant for "this did not work" (owner
     * call 2026-09-23: errors read better as a snackbar than as an alert box).
     */
    tone?: EditorHintSnackbarTone;
    /** Figma 53977:34280: text above a separate action and close row. */
    layout?: 'compact' | 'long';
    /** Hide for this session (the X / check affordance). */
    onClose: () => void;
    /**
     * The text action. Defaults to hiding permanently ("nicht mehr anzeigen", the caller
     * persists the choice); a caller with a different action names it via `actionLabel`.
     * Without a handler there is no action — only the close affordance.
     */
    onDismiss?: () => void;
    actionLabel?: string;
    actionDisabled?: boolean;
    /** Optional second action, e.g. preview alongside "do not show again". */
    secondaryAction?: { label: string; onClick: () => void; disabled?: boolean };
    /** Accessible name of the close affordance, when "close hint" is not the right word. */
    closeLabel?: string;
};

/**
 * M3 snackbar inside the editor surface (Figma Admin.ORISO 1229-17864 blocker,
 * 1261-51137 success). Overlays the bottom of the editor; the editor reserves
 * scroll space for it so neither legal text nor controls become unreachable,
 * including on narrow viewports.
 */
export const EditorHintSnackbar = ({
    text,
    tone = 'blocker',
    layout = 'compact',
    onClose,
    onDismiss,
    actionLabel,
    actionDisabled = false,
    secondaryAction,
    closeLabel,
}: EditorHintSnackbarProps) => {
    const { t } = useTranslation();
    const isSuccess = tone === 'success';
    const toneClass = `${isSuccess ? styles.hintSnackbarSuccess : ''} ${
        tone === 'error' ? styles.hintSnackbarError : ''
    }`;
    let closeIcon = <Close />;
    if (layout === 'long') closeIcon = <FigmaCloseIcon className={styles.hintSnackbarCloseIcon} aria-hidden="true" />;
    if (isSuccess) closeIcon = <Check className={styles.hintSnackbarSuccessIcon} />;
    return (
        <div className={`${styles.hintSnackbar} ${layout === 'long' ? styles.hintSnackbarLong : ''} ${toneClass}`}>
            <span className={styles.hintSnackbarText} role="status">
                {text}
            </span>
            {(onDismiss || secondaryAction) && (
                <div className={styles.hintSnackbarActions}>
                    {secondaryAction && (
                        <button
                            type="button"
                            className={styles.hintSnackbarAction}
                            onClick={secondaryAction.onClick}
                            disabled={secondaryAction.disabled}
                        >
                            {secondaryAction.label}
                        </button>
                    )}
                    {onDismiss && (
                        <button
                            type="button"
                            className={styles.hintSnackbarAction}
                            onClick={onDismiss}
                            disabled={actionDisabled}
                        >
                            {actionLabel ?? t('legal.help.snackbar.dismiss')}
                        </button>
                    )}
                </div>
            )}
            <button
                type="button"
                className={styles.hintSnackbarClose}
                aria-label={
                    closeLabel ?? t(isSuccess ? 'legal.help.snackbar.acknowledge' : 'legal.help.snackbar.close')
                }
                onClick={onClose}
            >
                {closeIcon}
            </button>
        </div>
    );
};

export default EditorHintSnackbar;
