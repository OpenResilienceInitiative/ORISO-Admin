import type { ReactNode } from 'react';
import classNames from 'classnames';
import styles from './styles.module.scss';

export interface PillProps {
    label: ReactNode;
    selected?: boolean;
    disabled?: boolean;
    /** Locked pills stay visually selected but cannot be toggled (e.g. default language). */
    locked?: boolean;
    onClick?: () => void;
    ariaLabel?: string;
    className?: string;
}

/**
 * M3 selectable pill (Figma Admin.ORISO — language selectors). Fully rounded,
 * outlined when unselected, secondary-tonal filled when selected. Unlike
 * FilterChip it carries no leading check — used for compact language/segment sets.
 */
export const Pill = ({
    label,
    selected = false,
    disabled = false,
    locked = false,
    onClick,
    ariaLabel,
    className,
}: PillProps) => (
    <button
        type="button"
        role="checkbox"
        aria-checked={selected || locked}
        aria-label={ariaLabel}
        disabled={disabled || locked}
        className={classNames(
            styles.pill,
            { [styles.selected]: selected || locked, [styles.locked]: locked },
            className,
        )}
        onClick={onClick}
    >
        {label}
    </button>
);
