import type { ReactNode } from 'react';
import classNames from 'classnames';
import styles from './styles.module.scss';

export type IconButtonVariant = 'filled' | 'standard';

export interface IconButtonProps {
    icon: ReactNode;
    /** Required accessible name (icon-only control). */
    ariaLabel: string;
    onClick?: () => void;
    variant?: IconButtonVariant;
    disabled?: boolean;
    /** Square hit-area in px (icon scales to ~24). Default 40. */
    size?: number;
    className?: string;
}

/**
 * M3 icon button (Figma Admin.ORISO — postal-code delete, field-clear affordances).
 * `filled` = secondary-container tonal circle; `standard` = transparent with a
 * hover state layer. Always circular; colours are M3 CSS variables.
 */
export const IconButton = ({
    icon,
    ariaLabel,
    onClick,
    variant = 'standard',
    disabled = false,
    size = 40,
    className,
}: IconButtonProps) => (
    <button
        type="button"
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={onClick}
        style={{ width: size, height: size }}
        className={classNames(styles.button, styles[variant], className)}
    >
        <span className={styles.icon} aria-hidden>
            {icon}
        </span>
    </button>
);
