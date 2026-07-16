import { forwardRef, useId, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import classNames from 'classnames';
import styles from './styles.module.scss';

export interface FilterInputProps
    extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'size' | 'placeholder'> {
    /** Field name — rendered as the floating label (sits as the placeholder, floats up on focus/fill). */
    label: string;
    /** Leading icon (typically an antd icon). */
    icon?: ReactNode;
    value?: string;
    onValueChange?: (value: string) => void;
    /** Error message: switches the field to the error state and is announced to AT. */
    error?: string;
    /** Render without the pill border/background (e.g. embedded in another surface). */
    bare?: boolean;
    className?: string;
}

/**
 * A bordered free-text filter pill with an MUI-style floating label (#310): the
 * label sits where a placeholder would and animates up into a small caption once
 * the field is focused or filled. Lifts (elevation) while focused; the error state
 * turns the outline and label to the error colour. Standalone and composable
 * inside `TableFilterBar`. Controlled via `value`/`onValueChange` or uncontrolled.
 */
export const FilterInput = forwardRef<HTMLInputElement, FilterInputProps>(function FilterInput(
    { label, icon, value, onValueChange, error, bare = false, className, disabled, onFocus, onBlur, ...rest },
    ref,
) {
    const [focused, setFocused] = useState(false);
    const [internalValue, setInternalValue] = useState('');
    const inputId = useId();
    const errorId = useId();

    const isControlled = value !== undefined;
    const currentValue = isControlled ? value : internalValue;
    const floated = focused || currentValue.length > 0;

    return (
        <span className={classNames(styles.fieldWrap, className)}>
            <span
                className={classNames({
                    [styles.pill]: !bare,
                    [styles.inputField]: !bare,
                    [styles.pillFocused]: focused && !bare,
                    [styles.pillError]: Boolean(error) && !bare,
                    [styles.pillDisabled]: disabled,
                })}
            >
                {icon && (
                    <span className={styles.icon} aria-hidden>
                        {icon}
                    </span>
                )}
                <span className={styles.floatBox}>
                    <label
                        htmlFor={inputId}
                        className={classNames(styles.floatLabel, { [styles.floatLabelUp]: floated })}
                    >
                        {label}
                    </label>
                    <input
                        {...rest}
                        ref={ref}
                        id={inputId}
                        className={classNames(styles.input, styles.floatInput)}
                        type="text"
                        value={currentValue}
                        disabled={disabled}
                        aria-invalid={error ? true : undefined}
                        aria-errormessage={error ? errorId : undefined}
                        onChange={(event) => {
                            if (!isControlled) {
                                setInternalValue(event.target.value);
                            }

                            onValueChange?.(event.target.value);
                        }}
                        onFocus={(event) => {
                            setFocused(true);
                            onFocus?.(event);
                        }}
                        onBlur={(event) => {
                            setFocused(false);
                            onBlur?.(event);
                        }}
                    />
                </span>
            </span>
            {error && (
                <span id={errorId} className={styles.errorText} role="alert">
                    {error}
                </span>
            )}
        </span>
    );
});

export default FilterInput;
