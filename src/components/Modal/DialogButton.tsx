import classNames from 'classnames';
import { ButtonHTMLAttributes, ReactNode } from 'react';
import styles from './styles.module.scss';

interface DialogButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    /** Brand-coloured confirming action. Omit for neutral/secondary actions. */
    primary?: boolean;
    /**
     * Data-losing action (discard, delete): the M3 error role. Mutually
     * exclusive with `primary` — an action cannot be both the safe default
     * and the destructive one.
     */
    destructive?: boolean;
    /** Shows a spinner and disables the button. */
    loading?: boolean;
    children: ReactNode;
}

/**
 * The one and only dialog action button (flat M3 text button). Every dialog footer
 * — standard actions and custom footers alike — must use this so all dialogs share
 * a single button style: neutral grey for secondary actions, brand colour for the
 * primary/confirming action, error colour for destructive ones.
 */
export const DialogButton = ({
    primary,
    destructive,
    loading,
    disabled,
    children,
    className,
    ...rest
}: DialogButtonProps) => (
    <button
        type="button"
        className={classNames(
            styles.actionButton,
            { [styles.actionButtonPrimary]: primary && !destructive, [styles.actionButtonDestructive]: destructive },
            className,
        )}
        disabled={disabled || loading}
        {...rest}
    >
        {loading && <span className={styles.actionSpinner} aria-hidden />}
        {children}
    </button>
);
