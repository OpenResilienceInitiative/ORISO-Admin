import type { ReactNode } from 'react';
import classNames from 'classnames';
import styles from './styles.module.scss';

export type M3ButtonVariant = 'text' | 'outlined' | 'filled' | 'tonal';

export interface M3ButtonProps {
    children: ReactNode;
    variant?: M3ButtonVariant;
    /** Leading icon (18px), inherits the label colour. */
    icon?: ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    type?: 'button' | 'submit';
    /** Stretch to the container width (e.g. "Link OTP App" full-width action). */
    block?: boolean;
    className?: string;
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
    type = 'button',
    block = false,
    className,
}: M3ButtonProps) => (
    <button
        type={type === 'submit' ? 'submit' : 'button'}
        disabled={disabled}
        onClick={onClick}
        className={classNames(styles.button, styles[variant], { [styles.block]: block }, className)}
    >
        {icon && (
            <span className={styles.icon} aria-hidden>
                {icon}
            </span>
        )}
        {children}
    </button>
);
