import { useState } from 'react';
import { CounsellorAvatarField } from '../CounsellorAvatarField';
import { DialogButton, Modal } from '../Modal';
import type { CounsellorAvatarValue, CounsellorNameParts } from '../../utils/counsellorAvatar';
import styles from './styles.module.scss';

export interface AvatarPickerDialogProps extends CounsellorNameParts {
    value: CounsellorAvatarValue;
    title: string;
    description: string;
    cancelLabel: string;
    confirmLabel: string;
    onCancel: () => void;
    /** Only called with the choice made inside the dialog. "Abbrechen" keeps the old one. */
    onConfirm: (value: CounsellorAvatarValue) => void;
}

/**
 * Popup behind "Ändern": the same picker the counsellor wizard already uses
 * (`CounsellorAvatarField`: initials tile plus the animal motifs), in the
 * house dialog. The choice is held locally until "Übernehmen".
 */
export const AvatarPickerDialog = ({
    value,
    title,
    description,
    cancelLabel,
    confirmLabel,
    onCancel,
    onConfirm,
    ...names
}: AvatarPickerDialogProps) => {
    const [draft, setDraft] = useState<CounsellorAvatarValue>(value);

    return (
        <Modal
            title={title}
            description={description}
            width={480}
            onClose={onCancel}
            footer={
                <div className={styles.dialogActions}>
                    <DialogButton onClick={onCancel}>{cancelLabel}</DialogButton>
                    <DialogButton primary onClick={() => onConfirm(draft)}>
                        {confirmLabel}
                    </DialogButton>
                </div>
            }
        >
            <CounsellorAvatarField value={draft} onChange={setDraft} {...names} />
        </Modal>
    );
};
