import * as React from 'react';
import { ConfigProvider, Form } from 'antd';
import type { Rule } from 'antd/lib/form';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormHelperText from '@mui/material/FormHelperText';
import Switch from '@mui/material/Switch';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import classNames from 'classnames';
import styles from './styles.module.scss';

/**
 * MUI `icon`/`checkedIcon` replace the default thumb, so each icon is wrapped
 * in a white circle that reproduces the thumb geometry. Glyphs are colored
 * (never white) so they stay visible on the white thumb.
 */
const uncheckedThumb = (
    <span className={styles.thumb}>
        <CloseIcon sx={{ fontSize: 16, color: 'var(--input-border-color, var(--m3-outline, #747878))' }} />
    </span>
);

const checkedThumb = (
    <span className={styles.thumb}>
        <CheckIcon sx={{ fontSize: 16, color: 'var(--admin-control-selected, var(--m3-primary, #a5000a))' }} />
    </span>
);

type FieldName = string | Array<string | number>;

interface MuiSwitchControlProps {
    /** Injected by antd Form.Item when `valuePropName="checked"`. */
    checked?: boolean;
    onChange?: (checked: boolean) => void;
    fieldName: FieldName;
    label?: React.ReactNode;
    disabled?: boolean;
    helpText?: string;
    switchLabel: string;
}

/**
 * Inner MUI switch. Reads validation status from the surrounding `Form.Item`
 * and the active error message from the form instance (same approach as
 * {@link MuiFormField}).
 */
const MuiSwitchControl = ({
    checked,
    onChange,
    fieldName,
    label,
    disabled,
    helpText,
    switchLabel,
}: MuiSwitchControlProps) => {
    const { componentDisabled } = ConfigProvider.useConfig();
    const isDisabled = componentDisabled || disabled;
    const { status } = Form.Item.useStatus();
    const form = Form.useFormInstance();
    const isError = status === 'error';
    const errors = form?.getFieldError(fieldName as any) ?? [];
    const helperText = (isError && errors[0]) || helpText || undefined;

    const handleChange = (_event: React.ChangeEvent<HTMLInputElement>, nextChecked: boolean) => {
        onChange?.(nextChecked);
    };

    return (
        <div className={styles.control}>
            <FormControlLabel
                className={classNames(styles.formControlLabel, {
                    [styles.formControlLabelDisabled]: isDisabled,
                })}
                label={label ?? ''}
                labelPlacement="start"
                disabled={isDisabled}
                control={
                    <Switch
                        className={classNames(styles.switch, { [styles.switchDisabled]: isDisabled })}
                        focusVisibleClassName=".Mui-focusVisible"
                        disableRipple
                        icon={uncheckedThumb}
                        checkedIcon={checkedThumb}
                        checked={!!checked}
                        onChange={handleChange}
                        disabled={isDisabled}
                        slotProps={{ input: { 'aria-label': switchLabel } }}
                    />
                }
            />
            {helperText ? (
                <FormHelperText
                    error={isError}
                    className={classNames(styles.helperText, { [styles.helperTextError]: isError })}
                >
                    {helperText}
                </FormHelperText>
            ) : null}
        </div>
    );
};

export interface MuiSwitchFieldProps {
    name: FieldName;
    label?: React.ReactNode;
    rules?: Rule[];
    required?: boolean;
    disabled?: boolean;
    /** Static helper text shown below the switch (overridden by error message). */
    helpText?: string;
    className?: string;
    /**
     * Accessible name for the switch control. Defaults to `label` when it is a
     * string; required when `label` is a complex React node.
     */
    switchLabel?: string;
}

/**
 * antd `Form.Item` (noStyle, `valuePropName="checked"`) wrapping a Material UI
 * iOS-styled `Switch`. Binding/validation stay on antd; presentation is MUI.
 */
export const MuiSwitchField = ({
    name,
    label,
    rules,
    required,
    disabled,
    helpText,
    className,
    switchLabel,
}: MuiSwitchFieldProps) => {
    let accessibleSwitchLabel = switchLabel;
    if (!accessibleSwitchLabel) {
        if (typeof label === 'string') {
            accessibleSwitchLabel = label;
        } else if (typeof label === 'number') {
            accessibleSwitchLabel = String(label);
        } else {
            accessibleSwitchLabel = 'toggle';
        }
    }

    return (
        <div className={classNames(styles.root, className)}>
            <Form.Item name={name as any} rules={rules} required={required} valuePropName="checked" noStyle>
                <MuiSwitchControl
                    fieldName={name}
                    label={label}
                    disabled={disabled}
                    helpText={helpText}
                    switchLabel={accessibleSwitchLabel}
                />
            </Form.Item>
        </div>
    );
};

export default MuiSwitchField;
