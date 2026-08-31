import type { ReactNode } from 'react';
import classNames from 'classnames';
import styles from './statTile.module.scss';

export interface StatTileProps {
    label: string;
    value: ReactNode;
    /** `error` renders the value in the magenta error role. */
    tone?: 'default' | 'error';
    /** Toggled state when the tile acts as a filter (`aria-pressed`). */
    active?: boolean;
    /** Makes the tile an interactive filter toggle. */
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
}

/**
 * Small summary stat tile for the strip above a data table (count + label).
 * With `onClick` it becomes a filter toggle whose selected state mirrors the
 * selected `FilterChip` (secondary tonal fill).
 *
 * Deliberately NOT `StatisticCard`: that component is welded to the statistic
 * dashboard's global stylesheet, animated values and trend badges — far more
 * card than a four-tile filter strip needs.
 */
export const StatTile = ({
    label,
    value,
    tone = 'default',
    active = false,
    onClick,
    disabled,
    className,
}: StatTileProps) => {
    const content = (
        <>
            <span className={classNames(styles.value, { [styles.valueError]: tone === 'error' })}>{value}</span>
            <span className={styles.label}>{label}</span>
        </>
    );

    if (!onClick) {
        return <div className={classNames(styles.tile, className)}>{content}</div>;
    }

    return (
        <button
            type="button"
            aria-pressed={active}
            disabled={disabled}
            onClick={onClick}
            className={classNames(styles.tile, styles.interactive, { [styles.active]: active }, className)}
        >
            {content}
        </button>
    );
};
