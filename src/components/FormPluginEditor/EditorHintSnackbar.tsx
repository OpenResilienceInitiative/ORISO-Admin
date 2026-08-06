import { Close } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import styles from './M3RichTextEditor.module.scss';

export type EditorHintSnackbarProps = {
    text: React.ReactNode;
    /** Hide for this session (the X affordance). */
    onClose: () => void;
    /** Hide permanently ("nicht mehr anzeigen") — the caller persists the choice. */
    onDismiss: () => void;
};

/**
 * M3 snackbar for a functionality-blocker CTA (Figma Admin.ORISO 1229-17864),
 * e.g. "you must publish a DPA before creating tenants". Overlays the bottom of
 * the editor surface. The editor reserves scroll space for the overlay so neither
 * legal text nor controls become unreachable, including on narrow viewports.
 */
export const EditorHintSnackbar = ({ text, onClose, onDismiss }: EditorHintSnackbarProps) => {
    const { t } = useTranslation();
    return (
        <div className={styles.hintSnackbar}>
            <span className={styles.hintSnackbarText} role="status">
                {text}
            </span>
            <button type="button" className={styles.hintSnackbarAction} onClick={onDismiss}>
                {t('legal.help.snackbar.dismiss')}
            </button>
            <button
                type="button"
                className={styles.hintSnackbarClose}
                aria-label={t('legal.help.snackbar.close')}
                onClick={onClose}
            >
                <Close />
            </button>
        </div>
    );
};

export default EditorHintSnackbar;
