import type { HTMLAttributes, ReactNode } from 'react';
import styles from './styles.module.scss';

/**
 * A permanent explanation or read-only hint, as plain text inside its tile.
 * It is not a notification and not a box: no surface, no border, no icon. Events (a failed save,
 * a conflict) go through `<Notify>` instead. Optional text actions sit under the text, for a
 * state the screen cannot continue without (for example "retry" next to "could not load").
 */
export interface HintAction {
    label: string;
    onClick: () => void;
    disabled?: boolean;
}

export interface HintTextProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
    children: ReactNode;
    /** `error` colours field-level validation text and unavailable states; otherwise the quiet supporting colour. */
    tone?: 'default' | 'error';
    title?: ReactNode;
    actions?: readonly HintAction[];
}

export const HintText = ({ children, tone = 'default', title, actions, className, ...rest }: HintTextProps) => (
    <div
        {...rest}
        className={[styles.hint, tone === 'error' ? styles.error : '', className ?? ''].filter(Boolean).join(' ')}
    >
        {title ? <strong className={styles.title}>{title}</strong> : null}
        <div>{children}</div>
        {actions?.length ? (
            <div className={styles.actions}>
                {actions.map((action, index) => (
                    <button
                        // Two actions may share a label; the list is static per render, so the index is a stable key.
                        // eslint-disable-next-line react/no-array-index-key
                        key={`${index}-${action.label}`}
                        type="button"
                        className={styles.action}
                        disabled={action.disabled}
                        onClick={action.onClick}
                    >
                        {action.label}
                    </button>
                ))}
            </div>
        ) : null}
    </div>
);

export default HintText;
