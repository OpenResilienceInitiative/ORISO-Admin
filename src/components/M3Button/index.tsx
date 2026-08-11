import type { ReactNode } from 'react';
import classNames from 'classnames';
import CircularProgress from '@mui/material/CircularProgress';
import styles from './styles.module.scss';

export type M3ButtonVariant = 'text' | 'outlined' | 'filled' | 'tonal';

export interface M3ButtonProps {
    children: ReactNode;
    variant?: M3ButtonVariant;
    /** Leading icon (18px), inherits the label colour. */
    icon?: ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    /** Disables the action and replaces its icon with an accessible progress indicator. */
    loading?: boolean;
    type?: 'button' | 'submit';
    /** Stretch to the container width (e.g. "Link OTP App" full-width action). */
    block?: boolean;
    className?: string;
    /** For toggle-style buttons (e.g. a mode switch) — exposes pressed/unpressed state. */
    'aria-pressed'?: boolean;
}

/**
 * M3 button atom (Figma Admin.ORISO). Four variants — text, outlined, filled,
 * tonal — all height 40, fully rounded, label-large (Inter 14/500). Primary is
 * the OrisoScheme red (#A5000A); colours come from M3 CSS variables only. Replaces
 * the legacy slate `button.less` control for new work.
 */
export const M3Button = ({
    children,
    variant = 'text',
    icon,
    onClick,
    disabled = false,
    loading = false,
    type = 'button',
    block = false,
    className,
    'aria-pressed': ariaPressed,
}: M3ButtonProps) => (
    <button
        type={type === 'submit' ? 'submit' : 'button'}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        aria-pressed={ariaPressed}
        onClick={onClick}
        className={classNames(styles.button, styles[variant], { [styles.block]: block }, className)}
    >
        {loading && (
            <span className={styles.icon}>
                <CircularProgress size={18} color="inherit" />
            </span>
        )}
        {!loading && icon && (
            <span className={styles.icon} aria-hidden>
                {icon}
            </span>
        )}
        {children}
    </button>
);
