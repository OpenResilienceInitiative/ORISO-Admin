import { useId, useState } from 'react';
import { CounsellorAvatarField } from '../CounsellorAvatarField';
import { OutlinedTextField } from './OutlinedTextField';
import { DialogButton, Modal } from '../Modal';
import type { CounsellorAvatarValue } from '../../utils/counsellorAvatar';
import styles from './styles.module.scss';

export interface InviteSuggestion {
    avatar: CounsellorAvatarValue;
    displayName: string;
}

export interface InviteSuggestionDialogProps {
    /** Name of the invitee, shown in the description so the admin knows who this is for. */
    inviteeName: string;
    value: InviteSuggestion;
    title: string;
    description: string;
    displayNameLabel: string;
    displayNameHint: string;
    clearLabel: string;
    cancelLabel: string;
    confirmLabel: string;
    onCancel: () => void;
    onConfirm: (value: InviteSuggestion) => void;
}

/**
 * Invite composer: the inviting admin may suggest an icon and a display name.
 * Both are optional — "Vorschlag entfernen" sends the invite without them, and
 * the invitee then starts with the initials tile as today. The invitee can
 * change both on the account page.
 */
export const InviteSuggestionDialog = ({
    inviteeName,
    value,
    title,
    description,
    displayNameLabel,
    displayNameHint,
    clearLabel,
    cancelLabel,
    confirmLabel,
    onCancel,
    onConfirm,
}: InviteSuggestionDialogProps) => {
    const hintId = useId();
    const [draft, setDraft] = useState<InviteSuggestion>(value);

    return (
        <Modal
            title={title}
            description={`${description} ${inviteeName}`}
            width={520}
            onClose={onCancel}
            footer={
                <div className={styles.dialogActions}>
                    <DialogButton onClick={() => onConfirm({ avatar: {}, displayName: '' })}>{clearLabel}</DialogButton>
                    <DialogButton onClick={onCancel}>{cancelLabel}</DialogButton>
                    <DialogButton primary onClick={() => onConfirm(draft)}>
                        {confirmLabel}
                    </DialogButton>
                </div>
            }
        >
            <div className={styles.suggestion}>
                <OutlinedTextField
                    label={displayNameLabel}
                    value={draft.displayName}
                    describedBy={hintId}
                    onChange={(displayName) => setDraft({ ...draft, displayName })}
                />
                <p id={hintId} className={styles.hint}>
                    {displayNameHint}
                </p>
                <CounsellorAvatarField
                    value={draft.avatar}
                    onChange={(avatar) => setDraft({ ...draft, avatar })}
                    displayName={draft.displayName}
                />
            </div>
        </Modal>
    );
};
