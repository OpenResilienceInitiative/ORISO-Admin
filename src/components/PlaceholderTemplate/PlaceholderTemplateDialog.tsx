import { ReactNode } from 'react';
import { Modal } from '../Modal';
import styles from './PlaceholderTemplateDialog.module.scss';

export interface PlaceholderTemplateDialogProps {
    /** i18n key of the centered dialog title (house M3 anatomy). */
    titleKey: string;
    /** One sentence under the title saying what the dialog is for. */
    descriptionKey?: string;
    /**
     * A placeholder-template editor variant. Its own <h3> heading is visually
     * hidden inside the dialog — the dialog title is the single visible one;
     * the section keeps its accessible name via its aria-label.
     */
    children: ReactNode;
    onSave: () => void;
    onClose: () => void;
    /**
     * X button / Escape / mask click, when they must differ from the Cancel
     * text button (e.g. Cancel steps back to a list while X closes the whole
     * dialog). Defaults to `onClose`.
     */
    onDismiss?: () => void;
    /** Disables "Speichern" (e.g. while submitting or invalid). */
    saveDisabled?: boolean;
    /** Id of an element explaining the save button (e.g. why it is disabled). */
    saveDescribedBy?: string;
    /**
     * Replaces the standard Abbrechen/Speichern row — used when the dialog
     * switches into a sub-state with its own actions (e.g. the discard-changes
     * question), so that state stays inside THIS dialog instead of opening a
     * second overlay.
     */
    footer?: ReactNode;
    width?: number | string;
}

/**
 * House M3 dialog shell for the placeholder-template module — the same
 * anatomy as every other admin dialog (Organisms/Modal, Design-System
 * M3_ORISO node 60942-12062): centered headline, optional description,
 * body, divider and right-aligned Abbrechen/Speichern text buttons. The
 * wrapped editor keeps its template split button and live preview. This is
 * the shell the invite wiring (#746) and the legal editors embed.
 */
export const PlaceholderTemplateDialog = ({
    titleKey,
    descriptionKey,
    children,
    onSave,
    onClose,
    onDismiss,
    saveDisabled = false,
    saveDescribedBy,
    footer,
    width = 1080,
}: PlaceholderTemplateDialogProps) => (
    <Modal
        titleKey={titleKey}
        descriptionKey={descriptionKey}
        footer={footer}
        okLabelKey="save"
        cancelLabelKey="cancel"
        onConfirm={onSave}
        onClose={onClose}
        onDismiss={onDismiss}
        confirmDisabled={saveDisabled}
        confirmDescribedBy={saveDescribedBy}
        width={width}
    >
        <div className={styles.body}>{children}</div>
    </Modal>
);

export default PlaceholderTemplateDialog;
