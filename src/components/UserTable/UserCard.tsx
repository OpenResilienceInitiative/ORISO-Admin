import { useId, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import type { DisplayStatus } from '../../types/userDisplayStatus';
import { IconButton } from '../IconButton';
import { StatusBadge } from './StatusBadge';
import styles from './userCard.module.scss';

export interface UserCardProps {
    name: string;
    email: string;
    status: DisplayStatus;
    /** Target of the „Eingeladen" link. */
    inviteTo?: string;
    /** Extra details shown when expanded (Träger, Stellen, …). */
    children?: ReactNode;
    defaultExpanded?: boolean;
    /** Omitted = no permission; the button is left out. */
    onEdit?: () => void;
    onDelete?: () => void;
    /** E.g. while the account is being deleted. */
    actionsDisabled?: boolean;
}

/** Phone card (< 768px): one row with name over status, expand next to edit and delete. */
export const UserCard = ({
    name,
    email,
    status,
    inviteTo,
    children,
    defaultExpanded = false,
    onEdit,
    onDelete,
    actionsDisabled = false,
}: UserCardProps) => {
    const { t } = useTranslation();
    const detailsId = useId();
    const [expanded, setExpanded] = useState(defaultExpanded);
    const displayName = name || email;

    return (
        <article className={styles.card} aria-label={displayName}>
            <div className={styles.summary}>
                <div className={styles.lead}>
                    <span className={styles.name} title={displayName}>
                        {displayName}
                    </span>
                    <StatusBadge status={status} inviteTo={inviteTo} />
                </div>
                <div className={styles.actions}>
                    <IconButton
                        icon={expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                        ariaLabel={t('userTable.card.details', 'Details zu {{name}}', { name: displayName })}
                        ariaExpanded={expanded}
                        ariaControls={detailsId}
                        onClick={() => setExpanded((open) => !open)}
                    />
                    {onEdit && (
                        <IconButton
                            icon={<EditOutlinedIcon />}
                            ariaLabel={t('userTable.card.edit', '{{name}} bearbeiten', { name: displayName })}
                            disabled={actionsDisabled}
                            onClick={onEdit}
                        />
                    )}
                    {onDelete && (
                        <IconButton
                            icon={<DeleteOutlinedIcon />}
                            ariaLabel={t('userTable.card.delete', '{{name}} löschen', { name: displayName })}
                            disabled={actionsDisabled}
                            onClick={onDelete}
                        />
                    )}
                </div>
            </div>
            <div id={detailsId} className={styles.details} hidden={!expanded}>
                {expanded && (
                    <>
                        {name && <span className={styles.email}>{email}</span>}
                        {children}
                    </>
                )}
            </div>
        </article>
    );
};
