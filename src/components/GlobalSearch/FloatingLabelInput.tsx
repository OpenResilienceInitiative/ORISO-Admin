import { ChangeEvent, FocusEvent, useId, useState } from 'react';
import { Input, type InputProps, type InputRef } from 'antd';
import classNames from 'classnames';
import styles from './floatingLabelInput.module.scss';

export interface FloatingLabelInputProps extends Omit<InputProps, 'placeholder' | 'variant' | 'size'> {
    /** Visible label. Rests in the field like a placeholder, floats into the outline gap on focus/fill. */
    label: string;
    /** Renders the field in the M3 error state (error-coloured outline + label). */
    error?: boolean;
    /** Supporting text below the field; shown in the error colour while `error` is set. */
    supportingText?: string;
    ref?: React.Ref<InputRef>;
}

/**
 * M3 outlined text field with an animated floating label (Figma 1165:17005,
 * "Search Bar Admin Panel"): in the resting state only the label is visible in
 * placeholder position; on focus or when filled it floats up into the outline
 * gap. Colours come from the `--m3-*` admin theme tokens. The surface behind
 * the floated label defaults to the M3 background and can be aligned with the
 * parent surface via the `--global-search-field-surface` custom property.
 */
export const FloatingLabelInput = ({
    label,
    error = false,
    supportingText,
    className,
    id,
    value,
    defaultValue,
    disabled,
    ref,
    onBlur,
    onChange,
    onFocus,
    ...inputProps
}: FloatingLabelInputProps) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const supportingTextId = `${inputId}-supporting-text`;
    const [focused, setFocused] = useState(false);
    const [internalValue, setInternalValue] = useState(defaultValue ?? '');
    const isControlled = value !== undefined;
    const currentValue = isControlled ? value : internalValue;
    const hasValue = String(currentValue ?? '').length > 0;
    const floating = focused || hasValue;

    const handleFocus = (event: FocusEvent<HTMLInputElement>) => {
        setFocused(true);
        onFocus?.(event);
    };

    const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
        setFocused(false);
        onBlur?.(event);
    };

    const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
        if (!isControlled) {
            setInternalValue(event.target.value);
        }

        onChange?.(event);
    };

    return (
        <div
            className={classNames(
                styles.field,
                {
                    [styles.fieldFocused]: focused,
                    [styles.fieldError]: error,
                    [styles.fieldDisabled]: disabled,
                    [styles.labelFloating]: floating,
                },
                className,
            )}
        >
            <div className={styles.outline}>
                <Input
                    // eslint-disable-next-line react/jsx-props-no-spreading
                    {...inputProps}
                    id={inputId}
                    ref={ref}
                    className={styles.input}
                    variant="borderless"
                    value={currentValue}
                    disabled={disabled}
                    aria-invalid={error || undefined}
                    aria-describedby={supportingText ? supportingTextId : undefined}
                    onBlur={handleBlur}
                    onChange={handleChange}
                    onFocus={handleFocus}
                />
                <label className={styles.label} htmlFor={inputId}>
                    {label}
                </label>
            </div>
            {supportingText && (
                <span className={styles.supportingText} id={supportingTextId}>
                    {supportingText}
                </span>
            )}
        </div>
    );
};

export default FloatingLabelInput;
