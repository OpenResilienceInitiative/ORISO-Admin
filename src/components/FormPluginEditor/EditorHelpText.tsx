import { Error as InfoIcon } from '@mui/icons-material';
import styles from './M3RichTextEditor.module.scss';

export type EditorHelpTextProps = {
    /** Normal-weight description of what this editor is for. */
    text: React.ReactNode;
    /** Bold CTA tip rendered below the description (omit while it is shown as a snackbar). */
    hint?: React.ReactNode;
};

/**
 * "Editor Help Texts" block (Figma Admin.ORISO 1227-17235): info icon + role/state
 * dependent description directly under the card header, with the CTA tip in bold.
 */
export const EditorHelpText = ({ text, hint }: EditorHelpTextProps) => (
    <div className={styles.helpRow}>
        <InfoIcon className={styles.helpIcon} />
        <div className={styles.helpTexts}>
            <p className={styles.helpText}>{text}</p>
            {hint && <p className={styles.helpHint}>{hint}</p>}
        </div>
    </div>
);

export default EditorHelpText;
