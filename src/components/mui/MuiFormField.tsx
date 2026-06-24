import * as React from 'react';
import { Form } from 'antd';
import type { Rule } from 'antd/lib/form';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';

type FieldName = string | Array<string | number>;

interface MuiControlProps {
    /** Injected by antd Form.Item */
    value?: any;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onBlur?: React.FocusEventHandler<HTMLInputElement | HTMLTextAreaElement>;
    /** The field name, used to look up the active error message. */
    fieldName: FieldName;
    label?: React.ReactNode;
    placeholder?: string;
    type?: string;
    multiline?: boolean;
    minRows?: number;
    disabled?: boolean;
    autoComplete?: string;
    helpText?: string;
    inputProps?: Record<string, any>;
    endAdornment?: React.ReactNode;
}

/**
 * Inner MUI control. Reads validation status from the surrounding
 * `Form.Item` (via `Form.Item.useStatus()`) and the active error message from
 * the form instance (`getFieldError`) — antd 4.23's `useStatus()` only exposes
 * `status`, not the message text, so we look the message up by field name.
 */
const MuiControl = ({
    value,
    onChange,
    onBlur,
    fieldName,
    label,
    placeholder,
    type,
    multiline,
    minRows,
    disabled,
    autoComplete,
    helpText,
    inputProps,
    endAdornment,
}: MuiControlProps) => {
    const { status } = Form.Item.useStatus();
    const form = Form.useFormInstance();
    const isError = status === 'error';
    const errors = form?.getFieldError(fieldName as any) ?? [];
    // Keep height stable: always render a helperText line (' ' when empty).
    const helperText = (isError && errors[0]) || helpText || ' ';
    const muiInputProps =
        endAdornment || inputProps
            ? {
                  ...(endAdornment ? { endAdornment } : {}),
                  ...(inputProps ? { inputProps } : {}),
              }
            : undefined;

    return (
        <TextField
            variant="outlined"
            fullWidth
            label={label}
            placeholder={placeholder}
            type={type}
            multiline={multiline}
            minRows={minRows}
            value={value ?? ''}
            onChange={onChange}
            onBlur={onBlur}
            disabled={disabled}
            error={isError}
            helperText={helperText}
            autoComplete={autoComplete}
            InputProps={muiInputProps}
        />
    );
};

export interface MuiFormFieldProps {
    name: FieldName;
    label?: React.ReactNode;
    rules?: Rule[];
    required?: boolean;
    dependencies?: Array<string | number | (string | number)[]>;
    placeholder?: string;
    type?: string;
    multiline?: boolean;
    minRows?: number;
    disabled?: boolean;
    autoComplete?: string;
    /** Static helper text shown below the field (overridden by error message). */
    helpText?: string;
    inputProps?: Record<string, any>;
    endAdornment?: React.ReactNode;
    /** antd normalize hook (used by the number variant to coerce to a Number). */
    normalize?: (value: any, prevValue: any, allValues: any) => any;
}

/**
 * antd `Form.Item` (noStyle) wrapping a Material UI outlined `TextField`.
 * Default text variant; bind/validation handled by antd, presentation by MUI.
 */
export const MuiFormField = ({ name, label, rules, required, dependencies, normalize, ...rest }: MuiFormFieldProps) => (
    <Form.Item
        name={name as any}
        rules={rules}
        required={required}
        dependencies={dependencies as any}
        normalize={normalize}
        noStyle
    >
        <MuiControl fieldName={name} label={label} {...rest} />
    </Form.Item>
);

/**
 * Number variant. Coerces the submitted value to a `Number` via `normalize`
 * so e.g. `allowedNumberOfUsers` is stored as an integer, not a string.
 */
export const MuiNumberFormField = ({
    inputProps,
    min,
    ...props
}: Omit<MuiFormFieldProps, 'type' | 'normalize'> & { min?: number }) => (
    <MuiFormField
        {...props}
        type="number"
        inputProps={{ min, ...inputProps }}
        normalize={(value) => {
            if (value === '' || value === null || value === undefined) {
                return undefined;
            }
            const parsed = Number(value);
            return Number.isNaN(parsed) ? value : parsed;
        }}
    />
);

/**
 * Password variant with a show/hide toggle (MUI IconButton endAdornment).
 */
export const MuiPasswordFormField = ({
    autoComplete = 'new-password',
    ...props
}: Omit<MuiFormFieldProps, 'type' | 'endAdornment'>) => {
    const [visible, setVisible] = React.useState(false);
    return (
        <MuiFormField
            {...props}
            type={visible ? 'text' : 'password'}
            autoComplete={autoComplete}
            endAdornment={
                <InputAdornment position="end">
                    <IconButton
                        aria-label="toggle password visibility"
                        onClick={() => setVisible((prev) => !prev)}
                        onMouseDown={(event) => event.preventDefault()}
                        edge="end"
                        tabIndex={-1}
                        size="small"
                    >
                        {visible ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                </InputAdornment>
            }
        />
    );
};

/**
 * Multiline variant (e.g. description).
 */
export const MuiMultilineFormField = ({ minRows = 3, ...props }: Omit<MuiFormFieldProps, 'multiline' | 'type'>) => (
    <MuiFormField {...props} multiline minRows={minRows} />
);
