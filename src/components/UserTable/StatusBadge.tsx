import { useTranslation } from 'react-i18next';
import NorthEastIcon from '@mui/icons-material/NorthEast';
import classNames from 'classnames';
import { Link } from 'react-router-dom';
import routePathNames from '../../appConfig';
import type { DisplayStatus } from '../../types/userDisplayStatus';
import styles from './statusBadge.module.scss';

type Tone = 'active' | 'pending' | 'muted' | 'error';

const STATUS: Record<DisplayStatus, { label: string; tone: Tone }> = {
    ACTIVE: { label: 'Aktiv', tone: 'active' },
    CREATED: { label: 'Angelegt', tone: 'active' },
    ABSENT: { label: 'Abwesend', tone: 'muted' },
    IN_DELETION: { label: 'Wird gelöscht', tone: 'muted' },
    DISABLED: { label: 'Inaktiv', tone: 'error' },
    INACTIVE: { label: 'Inaktiv', tone: 'error' },
    ERROR: { label: 'Fehler', tone: 'error' },
    INVITED: { label: 'Eingeladen', tone: 'pending' },
    IN_PROGRESS: { label: 'In Bearbeitung', tone: 'pending' },
    null: { label: 'Unbekannt', tone: 'muted' },
};

export interface StatusBadgeProps {
    status: DisplayStatus;
    /** Target of the „Eingeladen" link; defaults to the invite section. */
    inviteTo?: string;
}

/** Account status as a word; the dot only repeats it. „Eingeladen" links to the invite. */
export const StatusBadge = ({ status, inviteTo = routePathNames.links }: StatusBadgeProps) => {
    const { t } = useTranslation();
    const { label, tone } = STATUS[status] ?? STATUS.null;
    const word = t(`userTable.status.${status}`, label);
    const content = (
        <>
            <span className={classNames(styles.dot, styles[tone])} aria-hidden />
            {word}
        </>
    );

    if (status === 'INVITED') {
        return (
            <Link
                to={inviteTo}
                className={classNames(styles.badge, styles.link)}
                aria-label={t('userTable.status.inviteLink', '{{status}} – Einladung öffnen', { status: word })}
            >
                {content}
                <NorthEastIcon className={styles.linkIcon} aria-hidden />
            </Link>
        );
    }
    return <span className={styles.badge}>{content}</span>;
};
