import Check from '@mui/icons-material/Check';
import Close from '@mui/icons-material/Close';
import { useTranslation } from 'react-i18next';
import styles from './M3RichTextEditor.module.scss';

export type EditorHintSnackbarTone = 'blocker' | 'success';

export type EditorHintSnackbarProps = {
    text: React.ReactNode;
    /**
     * `blocker` (default) is the dark inverse snackbar for "you cannot do X yet".
     * `success` is the blue secondary-container variant for "X happened" — same
     * shell, confirming rather than blocking (Figma Admin.ORISO 1261-51137).
     */
    tone?: EditorHintSnackbarTone;
    /** Hide for this session (the X / check affordance). */
    onClose: () => void;
    /** Hide permanently ("nicht mehr anzeigen") — the caller persists the choice. */
    onDismiss: () => void;
};

/**
 * M3 snackbar inside the editor surface (Figma Admin.ORISO 1229-17864 blocker,
 * 1261-51137 success). Overlays the bottom of the editor; the editor reserves
 * scroll space for it so neither legal text nor controls become unreachable,
 * including on narrow viewports.
 */
export const EditorHintSnackbar = ({ text, tone = 'blocker', onClose, onDismiss }: EditorHintSnackbarProps) => {
    const { t } = useTranslation();
    const isSuccess = tone === 'success';
    return (
        <div className={`${styles.hintSnackbar} ${isSuccess ? styles.hintSnackbarSuccess : ''}`}>
            <span className={styles.hintSnackbarText} role="status">
                {text}
            </span>
            <button type="button" className={styles.hintSnackbarAction} onClick={onDismiss}>
                {t('legal.help.snackbar.dismiss')}
            </button>
            <button
                type="button"
                className={styles.hintSnackbarClose}
                aria-label={t(isSuccess ? 'legal.help.snackbar.acknowledge' : 'legal.help.snackbar.close')}
                onClick={onClose}
            >
                {isSuccess ? <Check /> : <Close />}
            </button>
        </div>
    );
};

export default EditorHintSnackbar;
