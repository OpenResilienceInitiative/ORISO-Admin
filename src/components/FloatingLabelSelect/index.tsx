import { FocusEvent, useId, useState } from 'react';
import { ConfigProvider, Form, Select } from 'antd';
import type { BaseOptionType, DefaultOptionType, SelectProps } from 'antd/es/select';
import classNames from 'classnames';
import styles from './floatingLabelSelect.module.scss';

export interface FloatingLabelSelectProps<
    ValueType = any,
    OptionType extends BaseOptionType | DefaultOptionType = DefaultOptionType,
> extends Omit<SelectProps<ValueType, OptionType>, 'variant' | 'size'> {
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
    /** Optional leading icon inside the outline (Figma Admin.ORISO 900-7044 — session-duration clock). */
    leadingIcon?: React.ReactNode;
}

/**
 * M3 outlined select with the same animated floating label as
 * `FloatingLabelInput` (Figma 1165:17005): shares its outline/label shell so
 * a `SelectFormField` renders identically to a `FormInputField` in a form.
 */
export const FloatingLabelSelect = <
    ValueType = any,
    OptionType extends BaseOptionType | DefaultOptionType = DefaultOptionType,
>({
    label,
    error,
    supportingText,
    className,
    id,
    value,
    defaultValue,
    disabled,
    placeholder,
    leadingIcon,
    mode,
    onBlur,
    onFocus,
    onChange,
    ...selectProps
}: FloatingLabelSelectProps<ValueType, OptionType>) => {
    const generatedId = useId();
    const fieldId = id ?? generatedId;
    const supportingTextId = `${fieldId}-supporting-text`;
    const [focused, setFocused] = useState(false);
    const [internalValue, setInternalValue] = useState<ValueType | undefined>(
        defaultValue ?? (mode ? ([] as unknown as ValueType) : undefined),
    );
    const { status } = Form.Item.useStatus();
    const { componentDisabled } = ConfigProvider.useConfig();
    const isControlled = value !== undefined;
    const currentValue = isControlled ? value : internalValue;
    const hasValue = Array.isArray(currentValue)
        ? currentValue.length > 0
        : currentValue !== undefined && currentValue !== null && (currentValue as unknown) !== '';
    const floating = focused || hasValue;
    const hasError = error ?? status === 'error';
    const isDisabled = disabled ?? componentDisabled ?? false;

    const handleFocus = (event: FocusEvent<HTMLElement>) => {
        setFocused(true);
        onFocus?.(event);
    };

    const handleBlur = (event: FocusEvent<HTMLElement>) => {
        setFocused(false);
        onBlur?.(event);
    };

    const handleChange: SelectProps<ValueType, OptionType>['onChange'] = (nextValue, option) => {
        if (!isControlled) {
            setInternalValue(nextValue);
        }

        onChange?.(nextValue, option);
    };

    return (
        <div
            className={classNames(
                styles.field,
                {
                    [styles.fieldFocused]: focused,
                    [styles.fieldError]: hasError,
                    [styles.fieldDisabled]: isDisabled,
                    [styles.labelFloating]: floating,
                    [styles.hasLeadingIcon]: Boolean(leadingIcon),
                },
                className,
            )}
        >
            <div className={styles.outline}>
                {leadingIcon && (
                    <span className={styles.leadingIcon} aria-hidden>
                        {leadingIcon}
                    </span>
                )}
                <Select<ValueType, OptionType>
                    {...selectProps}
                    id={fieldId}
                    className={styles.select}
                    classNames={{ popup: { root: styles.dropdown } }}
                    variant="borderless"
                    mode={mode}
                    value={currentValue}
                    disabled={isDisabled}
                    placeholder={focused ? placeholder : undefined}
                    aria-invalid={hasError || undefined}
                    aria-describedby={supportingText ? supportingTextId : undefined}
                    onBlur={handleBlur}
                    onFocus={handleFocus}
                    onChange={handleChange}
                />
                <label className={styles.label} htmlFor={fieldId}>
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

export default FloatingLabelSelect;
