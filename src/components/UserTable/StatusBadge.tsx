import { useTranslation } from 'react-i18next';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import EventBusyOutlinedIcon from '@mui/icons-material/EventBusyOutlined';
import HelpOutlineOutlinedIcon from '@mui/icons-material/HelpOutlineOutlined';
import HourglassEmptyOutlinedIcon from '@mui/icons-material/HourglassEmptyOutlined';
import LockClockOutlinedIcon from '@mui/icons-material/LockClockOutlined';
import MailOutlineOutlinedIcon from '@mui/icons-material/MailOutlineOutlined';
import NorthEastIcon from '@mui/icons-material/NorthEast';
import PendingOutlinedIcon from '@mui/icons-material/PendingOutlined';
import classNames from 'classnames';
import { Link } from 'react-router-dom';
import routePathNames from '../../appConfig';
import type { DisplayStatus } from '../../types/userDisplayStatus';
import styles from './statusBadge.module.scss';

/** active = primary container, pending = tertiary container, ended = secondary container. */
type Tone = 'active' | 'pending' | 'ended';

const STATUS: Record<DisplayStatus, { label: string; tone: Tone; Icon: typeof CheckIcon }> = {
    ACTIVE: { label: 'Aktiv', tone: 'active', Icon: CheckIcon },
    ABSENT: { label: 'Abwesend', tone: 'pending', Icon: EventBusyOutlinedIcon },
    DISABLED: { label: 'Inaktiv', tone: 'pending', Icon: LockClockOutlinedIcon },
    INACTIVE: { label: 'Inaktiv', tone: 'pending', Icon: LockClockOutlinedIcon },
    INVITED: { label: 'Eingeladen', tone: 'pending', Icon: MailOutlineOutlinedIcon },
    CREATED: { label: 'Angelegt', tone: 'pending', Icon: PendingOutlinedIcon },
    IN_PROGRESS: { label: 'In Bearbeitung', tone: 'pending', Icon: HourglassEmptyOutlinedIcon },
    IN_DELETION: { label: 'Wird gelöscht', tone: 'ended', Icon: CloseIcon },
    ERROR: { label: 'Fehler', tone: 'ended', Icon: CloseIcon },
    null: { label: 'Unbekannt', tone: 'pending', Icon: HelpOutlineOutlinedIcon },
};

export interface StatusBadgeProps {
    status: DisplayStatus;
    /** Target of the „Eingeladen" link; defaults to the invite section. */
    inviteTo?: string;
}

/** Account status as a word; the icon only repeats it. „Eingeladen" links to the invite. */
export const StatusBadge = ({ status, inviteTo = routePathNames.links }: StatusBadgeProps) => {
    const { t } = useTranslation();
    const { label, tone, Icon } = STATUS[status] ?? STATUS.null;
    const word = t(`userTable.status.${status}`, label);
    const shared = {
        className: classNames(styles.badge, styles[tone], { [styles.link]: status === 'INVITED' }),
        'data-status': status,
        'data-tone': tone,
    };
    const content = (
        <>
            <Icon className={styles.icon} aria-hidden />
            {word}
        </>
    );

    if (status === 'INVITED') {
        return (
            <Link
                to={inviteTo}
                {...shared}
                aria-label={t('userTable.status.inviteLink', '{{status}} – Einladung öffnen', { status: word })}
            >
                {content}
                <NorthEastIcon className={styles.icon} aria-hidden />
            </Link>
        );
    }
    return <span {...shared}>{content}</span>;
};
