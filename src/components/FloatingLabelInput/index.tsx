import { ChangeEvent, ElementType, FocusEvent, useId, useState } from 'react';
import { ConfigProvider, Form, Input, type InputProps, type InputRef } from 'antd';
import classNames from 'classnames';
import styles from './floatingLabelInput.module.scss';

export interface FloatingLabelInputProps extends Omit<InputProps, 'variant' | 'size'> {
    /** Visible label. Rests in the field like a placeholder, floats into the outline gap on focus/fill. */
    label: string;
    /**
     * Renders the field in the M3 error state (error-coloured outline + label).
     * When omitted, the state is derived from a surrounding antd `Form.Item`
     * via `Form.Item.useStatus()`; pass a boolean to override.
     */
    error?: boolean;
    /** Supporting text below the field; shown in the error colour while the field is in the error state. */
    supportingText?: string;
    ref?: React.Ref<InputRef>;
    /**
     * Underlying antd control rendered inside the outlined shell.
     * Supports `Input` (default), `Input.Password` and `Input.TextArea`.
     */
    component?: ElementType;
}

/**
 * M3 outlined text field with an animated floating label (Figma 1165:17005,
 * "Search Bar Admin Panel"): in the resting state only the label is visible in
 * placeholder position; on focus or when filled it floats up into the outline
 * gap. A native `placeholder` (if provided) only appears once the field is
 * focused — MUI behaviour. Colours come from the `--m3-*` admin theme tokens.
 * The surface behind the floated label defaults to the M3 background and can
 * be aligned with the parent surface via the `--admin-field-label-surface`
 * (legacy: `--global-search-field-surface`) custom property.
 */
export const FloatingLabelInput = ({
    label,
    error,
    supportingText,
    className,
    id,
    value,
    defaultValue,
    disabled,
    placeholder,
    ref,
    component,
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
    // Inside a Form.Item this reflects the validation state; standalone it stays undefined.
    const { status } = Form.Item.useStatus();
    const { componentDisabled } = ConfigProvider.useConfig();
    const isControlled = value !== undefined;
    const currentValue = isControlled ? value : internalValue;
    const hasValue = String(currentValue ?? '').length > 0;
    const floating = focused || hasValue;
    const hasError = error ?? status === 'error';
    const isDisabled = disabled ?? componentDisabled ?? false;
    // `any` on purpose: the union of Input/Password/TextArea prop types would
    // reject the shared borderless/value/handler wiring below.
    const Component = (component ?? Input) as any;
    const isTextArea = component === Input.TextArea;

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
                    [styles.fieldError]: hasError,
                    [styles.fieldDisabled]: isDisabled,
                    [styles.fieldMultiline]: isTextArea,
                    [styles.labelFloating]: floating,
                },
                className,
            )}
        >
            <div className={styles.outline}>
                <Component
                    {...(isTextArea ? { autoSize: { minRows: 3 } } : null)}
                    {...inputProps}
                    id={inputId}
                    ref={ref}
                    className={styles.input}
                    variant="borderless"
                    placeholder={focused ? placeholder : undefined}
                    value={currentValue}
                    disabled={isDisabled}
                    aria-invalid={hasError || undefined}
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
