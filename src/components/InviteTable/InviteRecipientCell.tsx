import styles from './inviteRecipientCell.module.scss';

export interface InviteRecipientCellProps {
    /** Name, or the e-mail when the invitee has no name yet. */
    displayName: string;
    email: string;
    roleLabel: string;
    /** E.g. "Träger-ID 12". */
    idHint?: string;
}

/** Recipient column of the invite list; mirrors the inline cell in `InviteProgressBoard`. */
export const InviteRecipientCell = ({ displayName, email, roleLabel, idHint }: InviteRecipientCellProps) => (
    <div className={styles.identity}>
        <span className={styles.name}>{displayName}</span>
        {displayName !== email && <span className={styles.email}>{email}</span>}
        <span className={styles.meta}>
            <span className={styles.roleChip}>{roleLabel}</span>
            {idHint && <span className={styles.idHint}>{idHint}</span>}
        </span>
    </div>
);
