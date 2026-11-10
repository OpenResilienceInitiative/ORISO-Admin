import { InfoOutlined as InfoIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import styles from './M3RichTextEditor.module.scss';

export type EditorHelpTextProps = {
    /** Normal-weight description of what this editor is for. */
    text: React.ReactNode;
    /** Bold CTA tip rendered below the description (omit while it is shown as a snackbar). */
    hint?: React.ReactNode;
    /**
     * Permanent hide of the bold tip ("Nicht mehr anzeigen"). The caller persists the choice. The tip is
     * tile text, not a notification: it sits here, never in a pop-up.
     */
    onDismissHint?: () => void;
    /** Label of the hide link. Default: "Nicht mehr anzeigen". */
    dismissHintLabel?: string;
};

/**
 * "Editor Help Texts" block (Figma Admin.ORISO 1227-17235): info icon + role/state
 * dependent description directly under the card header, with the CTA tip in bold.
 */
export const EditorHelpText = ({ text, hint, onDismissHint, dismissHintLabel }: EditorHelpTextProps) => {
    const { t } = useTranslation();
    return (
        <div className={styles.helpRow}>
            <InfoIcon className={styles.helpIcon} />
            <div className={styles.helpTexts}>
                <p className={styles.helpText}>{text}</p>
                {hint && (
                    <p className={styles.helpHint}>
                        {hint}
                        {onDismissHint && (
                            <>
                                {' '}
                                <button type="button" className={styles.helpHintDismiss} onClick={onDismissHint}>
                                    {dismissHintLabel ?? t('legal.help.snackbar.dismiss')}
                                </button>
                            </>
                        )}
                    </p>
                )}
            </div>
        </div>
    );
};

export default EditorHelpText;
