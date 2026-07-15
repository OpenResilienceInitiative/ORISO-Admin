import { forwardRef, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import classNames from 'classnames';
import styles from './styles.module.scss';

export interface FilterInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'size'> {
    /** Accessible name for the field (required — a placeholder is not a label). */
    label: string;
    /** Leading icon (typically an antd icon). */
    icon?: ReactNode;
    value?: string;
    onValueChange?: (value: string) => void;
    /** Render without the pill border/background (e.g. embedded in another surface). */
    bare?: boolean;
    className?: string;
}

/**
 * A bordered free-text filter pill. Standalone and composable — drop it into a
 * `TableFilterBar` as a segment or use it on its own. Lifts (elevation) while
 * focused (default → focus states from the Figma filter set).
 */
export const FilterInput = forwardRef<HTMLInputElement, FilterInputProps>(function FilterInput(
    { label, icon, value, onValueChange, bare = false, className, disabled, onFocus, onBlur, ...rest },
    ref,
) {
    const [focused, setFocused] = useState(false);

    return (
        <div
            className={classNames(
                { [styles.pill]: !bare, [styles.inputField]: !bare },
                { [styles.pillFocused]: focused && !bare, [styles.pillDisabled]: disabled },
                className,
            )}
        >
            {icon && (
                <span className={styles.icon} aria-hidden>
                    {icon}
                </span>
            )}
            <input
                {...rest}
                ref={ref}
                className={classNames(styles.input, { [styles.searchInput]: bare })}
                type="text"
                aria-label={label}
                value={value}
                disabled={disabled}
                onChange={(event) => onValueChange?.(event.target.value)}
                onFocus={(event) => {
                    setFocused(true);
                    onFocus?.(event);
                }}
                onBlur={(event) => {
                    setFocused(false);
                    onBlur?.(event);
                }}
            />
        </div>
    );
});

export default FilterInput;
