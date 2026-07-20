import type { ReactNode } from 'react';
import classNames from 'classnames';
import styles from './styles.module.scss';

export interface FilterChipProps {
    label: ReactNode;
    /** Selected chips render filled (secondary tonal) with a leading check. */
    selected?: boolean;
    disabled?: boolean;
    onChange?: (next: boolean) => void;
    className?: string;
    /** Accessible name when `label` is not a plain string. */
    ariaLabel?: string;
}

const CheckIcon = () => (
    <svg className={styles.check} width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
        <path d="M7.1 12.3 3.6 8.8l1-1 2.5 2.5 5.3-5.3 1 1z" fill="currentColor" />
    </svg>
);

/**
 * M3 filter chip (Figma Admin.ORISO — Focus Topics / additional-function chips).
 * A single toggle: outlined + on-surface text when off; filled with the secondary
 * tonal, white text and a leading check when on. All colours are M3 CSS variables.
 */
export const FilterChip = ({
    label,
    selected = false,
    disabled = false,
    onChange,
    className,
    ariaLabel,
}: FilterChipProps) => (
    <button
        type="button"
        role="checkbox"
        aria-checked={selected}
        aria-label={ariaLabel}
        disabled={disabled}
        className={classNames(styles.chip, { [styles.selected]: selected }, className)}
        onClick={() => onChange?.(!selected)}
    >
        {selected && <CheckIcon />}
        <span className={styles.label}>{label}</span>
    </button>
);
