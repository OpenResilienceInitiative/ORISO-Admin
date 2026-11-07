import * as React from 'react';
import { ConfigProvider, Form } from 'antd';
import type { Rule } from 'antd/lib/form';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormHelperText from '@mui/material/FormHelperText';
import Switch from '@mui/material/Switch';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import classNames from 'classnames';
import { ReadOnlyTileContext } from '../../CardEditable/ReadOnlyTileContext';
import styles from './styles.module.scss';

/**
 * MUI `icon`/`checkedIcon` replace the default thumb, so each state brings its
 * own knob — the same switch as the Frontend Storybook (`Atoms/Switch`, #1374).
 * Off: an outline-coloured knob with a light ✕ on a tonal track with a 2px
 * outline (WCAG 1.4.11). On: white knob with a brand-coloured ✓. Glyph colours
 * live in the stylesheet so the disabled palette can override them.
 */
const uncheckedThumb = (
    <span className={classNames(styles.thumb, styles.thumbOff)} data-switch-thumb="off">
        <CloseIcon className={styles.glyph} sx={{ fontSize: 16 }} />
    </span>
);

const checkedThumb = (
    <span className={classNames(styles.thumb, styles.thumbOn)} data-switch-thumb="on">
        <CheckIcon className={styles.glyph} sx={{ fontSize: 16 }} />
    </span>
);

export interface MuiSwitchProps {
    checked: boolean;
    onChange?: (checked: boolean) => void;
    disabled?: boolean;
    readOnly?: boolean;
    /** Accessible name. Pass the id of an external <label> via `id` instead when one exists. */
    ariaLabel?: string;
    id?: string;
    className?: string;
}

/**
 * The bare M3 switch, without antd Form binding — for call sites that own their
 * own state and label (D2: the template dialog's "Aktiv" toggle, which is a
 * plain controlled value next to its own `<label htmlFor>`, not a Form.Item).
 *
 * Extracted so those call sites have somewhere to go other than antd's `Switch`.
 * When there IS a Form.Item, use {@link MuiSwitchField} — it adds the binding,
 * validation status and helper text on top of this.
 */
export const MuiSwitch = ({ checked, onChange, disabled, readOnly, ariaLabel, id, className }: MuiSwitchProps) => (
    <Switch
        checked={checked}
        className={classNames(
            styles.switch,
            { [styles.switchDisabled]: disabled, [styles.switchReadOnly]: readOnly },
            className,
        )}
        checkedIcon={checkedThumb}
        disabled={disabled}
        disableRipple
        focusVisibleClassName=".Mui-focusVisible"
        icon={uncheckedThumb}
        slotProps={{ input: { 'aria-label': ariaLabel, 'aria-disabled': readOnly || undefined, id } }}
        onChange={(_event, next) => {
            if (!readOnly) onChange?.(next);
        }}
    />
);

type FieldName = string | Array<string | number>;

interface MuiSwitchControlProps {
    /** Injected by antd Form.Item when `valuePropName="checked"`. */
    checked?: boolean;
    onChange?: (checked: boolean) => void;
    fieldName: FieldName;
    label?: React.ReactNode;
    disabled?: boolean;
    unavailable?: boolean;
    helpText?: string;
    switchLabel: string;
    confirmEnable?: (proceed: () => void) => void;
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
    unavailable,
    helpText,
    switchLabel,
    confirmEnable,
}: MuiSwitchControlProps) => {
    const { componentDisabled } = ConfigProvider.useConfig();
    const inReadOnlyTile = React.useContext(ReadOnlyTileContext);
    const isReadOnly = !!componentDisabled && inReadOnlyTile && !disabled && !unavailable;
    const isDisabled = !!disabled || !!unavailable || (!!componentDisabled && !isReadOnly);
    const { status } = Form.Item.useStatus();
    const form = Form.useFormInstance();
    const isError = status === 'error';
    const errors = form?.getFieldError(fieldName as any) ?? [];
    const helperText = (isError && errors[0]) || helpText || undefined;

    const handleChange = (nextChecked: boolean) => {
        if (isReadOnly || isDisabled) return;
        if (nextChecked && confirmEnable) {
            confirmEnable(() => onChange?.(true));
            return;
        }
        onChange?.(nextChecked);
    };

    return (
        <div className={styles.control}>
            <FormControlLabel
                className={classNames(styles.formControlLabel, {
                    [styles.formControlLabelDisabled]: isDisabled || isReadOnly,
                })}
                label={label ?? ''}
                labelPlacement="start"
                disabled={isDisabled}
                control={
                    <MuiSwitch
                        checked={!!checked}
                        onChange={handleChange}
                        disabled={isDisabled}
                        readOnly={isReadOnly}
                        ariaLabel={switchLabel}
                        className={classNames({ [styles.switchUnavailable]: unavailable })}
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
    /** The option does not exist yet: the text stays readable, the switch itself looks unavailable in every mode. */
    unavailable?: boolean;
    /** Static helper text shown below the switch (overridden by error message). */
    helpText?: string;
    className?: string;
    /**
     * Accessible name for the switch control. Defaults to `label` when it is a
     * string; required when `label` is a complex React node.
     */
    switchLabel?: string;
    /**
     * Asked before the switch turns ON; the value changes only when it calls `proceed`
     * (e.g. the supervision privacy-policy confirmation). Turning it off never asks.
     */
    confirmEnable?: (proceed: () => void) => void;
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
    unavailable,
    helpText,
    className,
    switchLabel,
    confirmEnable,
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
                    unavailable={unavailable}
                    helpText={helpText}
                    switchLabel={accessibleSwitchLabel}
                    confirmEnable={confirmEnable}
                />
            </Form.Item>
        </div>
    );
};

export default MuiSwitchField;
