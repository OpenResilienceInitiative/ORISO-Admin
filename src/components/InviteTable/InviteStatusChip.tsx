import classNames from 'classnames';
import { M3Tooltip } from '../M3Tooltip';
import styles from './inviteStatusChip.module.scss';

export interface InviteStatusChipProps {
    label: string;
    /** What the status means; shown on hover and keyboard focus. */
    hint: string;
    /** Expired, revoked or superseded: magenta error role. */
    dead?: boolean;
}

/** Send-state chip of the invite list; mirrors the inline chip in `InviteProgressBoard`. */
export const InviteStatusChip = ({ label, hint, dead = false }: InviteStatusChipProps) => (
    <M3Tooltip text={hint}>
        {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- the hint is the only place the status is explained, so it must be reachable without a mouse */}
        <span tabIndex={0} data-dead={dead || undefined} className={classNames(styles.chip, { [styles.dead]: dead })}>
            {label}
        </span>
    </M3Tooltip>
);
