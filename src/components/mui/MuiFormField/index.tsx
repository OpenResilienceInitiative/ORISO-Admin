import * as React from 'react';
import { useContext } from 'react';
import { Form } from 'antd';
import type { Rule } from 'antd/lib/form';
import DisabledContext from 'antd/es/config-provider/DisabledContext';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import ErrorOutlineOutlined from '@mui/icons-material/ErrorOutlineOutlined';
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
    startAdornment?: React.ReactNode;
    variant?: 'outlined' | 'filled';
    className?: string;
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
    startAdornment,
    variant = 'outlined',
    className,
}: MuiControlProps) => {
    const contextDisabled = useContext(DisabledContext);
    const isDisabled = contextDisabled || disabled;
    const { status } = Form.Item.useStatus();
    const form = Form.useFormInstance();
    const isError = status === 'error';
    const errors = form?.getFieldError(fieldName as any) ?? [];
    // Keep height stable: always render a helperText line (' ' when empty).
    // Error matches MUI TextField: `error` + `helperText` message.
    const helperText = (isError && errors[0]) || helpText || ' ';

    const errorAdornment = isError ? (
        <InputAdornment position="end">
            <ErrorOutlineOutlined
                aria-hidden
                data-testid="mui-form-field-error-icon"
                sx={{ color: 'var(--form-error, #cc0000)' }}
                fontSize="small"
            />
        </InputAdornment>
    ) : null;

    // Keep an existing trailing control (e.g. password visibility) when showing the error icon.
    const resolvedEndAdornment = isError ? (
        <>
            {errorAdornment}
            {endAdornment}
        </>
    ) : (
        endAdornment
    );

    const inputSlotProps =
        resolvedEndAdornment || startAdornment
            ? {
                  ...(resolvedEndAdornment ? { endAdornment: resolvedEndAdornment } : {}),
                  ...(startAdornment ? { startAdornment } : {}),
              }
            : undefined;
    const slotProps =
        inputSlotProps || inputProps
            ? {
                  ...(inputSlotProps ? { input: inputSlotProps } : {}),
                  ...(inputProps ? { htmlInput: inputProps } : {}),
              }
            : undefined;

    return (
        <TextField
            className={className}
            variant={variant}
            fullWidth
            sx={{
                width: '100%',
                minWidth: 0,
                maxWidth: '100%',
                boxSizing: 'border-box',
                fontFamily: 'var(--m3-body-font-family)',
                ...(isDisabled
                    ? {
                          opacity: 0.5,
                          cursor: 'not-allowed',
                          pointerEvents: 'auto',
                          '&:hover': { cursor: 'not-allowed' },
                      }
                    : null),
                // Story / demo: force hover appearance without a real pointer.
                '&.pseudo-hover .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'var(--admin-form-field-text, #1b1b1b)',
                },
                '&.pseudo-hover .MuiFilledInput-root': {
                    backgroundColor: 'var(--input-bg, rgba(0, 0, 0, 0.09))',
                },
                '& .MuiInputBase-root': {
                    width: '100%',
                    minWidth: 0,
                    maxWidth: '100%',
                    boxSizing: 'border-box',
                    backgroundColor: 'var(--input-bg)',
                    color: 'var(--admin-form-field-text)',
                    fontFamily: 'var(--m3-body-font-family)',
                    fontSize: 16,
                    lineHeight: '24px',
                    letterSpacing: '0.5px',
                },
                '& .MuiInputBase-input': {
                    minWidth: 0,
                    // MUI sizes the input with content-box (height 1.4375em +
                    // padding). The admin's global `box-sizing: border-box` reset
                    // otherwise collapses the field to ~33px, so restore it here.
                    boxSizing: 'content-box',
                    overflow: 'hidden',
                    color: 'inherit',
                    textOverflow: 'ellipsis',
                },
                '& .MuiInputBase-inputMultiline': {
                    overflow: 'auto',
                    textOverflow: 'clip',
                    whiteSpace: 'pre-wrap',
                    overflowWrap: 'anywhere',
                },
                '& .MuiInputLabel-root': {
                    maxWidth: 'calc(100% - 24px)',
                    color: 'var(--label-color)',
                    fontFamily: 'var(--m3-body-font-family)',
                },
                '& .MuiInputLabel-root.Mui-focused': {
                    color: 'var(--admin-form-field-text)',
                },
                '& .MuiInputLabel-root.Mui-error': {
                    color: 'var(--form-error, #cc0000)',
                },
                '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'var(--input-border-color)',
                },
                '& .MuiOutlinedInput-notchedOutline legend': {
                    width: 'fit-content',
                    marginBottom: 0,
                    borderBottom: 'none',
                    fontSize: '0.75em',
                },
                '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'var(--admin-form-field-text, #1b1b1b)',
                },
                // Focus: a clean solid black border (no browser outline / glow).
                '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'var(--admin-form-field-text, #1b1b1b)',
                    borderWidth: 2,
                },
                '& .MuiOutlinedInput-root.Mui-focused': {
                    outline: 'none',
                },
                // Error (outlined) — match MUI TextField error border/label.
                '& .MuiOutlinedInput-root.Mui-error .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'var(--form-error, #cc0000)',
                },
                '& .MuiOutlinedInput-root.Mui-error:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'var(--form-error, #cc0000)',
                },
                '& .MuiOutlinedInput-root.Mui-error.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'var(--form-error, #cc0000)',
                    borderWidth: 2,
                },
                // Error (filled) — underline + label use destructive color.
                '& .MuiFilledInput-underline.Mui-error:after': {
                    borderBottomColor: 'var(--form-error, #cc0000)',
                },
                '& .MuiFilledInput-underline.Mui-error:before': {
                    borderBottomColor: 'var(--form-error, #cc0000)',
                },
                // Disabled: keep normal colors; opacity on the field dims the control.
                '& .MuiInputBase-root.Mui-disabled': {
                    backgroundColor: 'var(--input-bg)',
                    color: 'var(--admin-form-field-text)',
                    cursor: 'not-allowed',
                    WebkitTextFillColor: 'var(--admin-form-field-text)',
                },
                '& .MuiInputBase-root.Mui-disabled:hover': {
                    cursor: 'not-allowed',
                },
                '& .MuiInputBase-root.Mui-disabled .MuiInputBase-input': {
                    color: 'var(--admin-form-field-text)',
                    WebkitTextFillColor: 'var(--admin-form-field-text)',
                    cursor: 'not-allowed',
                },
                '& .MuiOutlinedInput-root.Mui-disabled .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'var(--input-border-color)',
                },
                '& .MuiInputLabel-root.Mui-disabled': {
                    color: 'var(--label-color)',
                },
                '& .MuiFormHelperText-root': {
                    marginInline: '16px',
                    color: 'var(--admin-form-muted-text)',
                    fontFamily: 'var(--m3-body-font-family)',
                    overflowWrap: 'anywhere',
                },
                '& .MuiFormHelperText-root.Mui-error': {
                    color: 'var(--form-error, #cc0000)',
                },
            }}
            label={label}
            placeholder={placeholder}
            type={type}
            multiline={multiline}
            minRows={minRows}
            value={value ?? ''}
            onChange={onChange}
            onBlur={onBlur}
            disabled={isDisabled}
            error={isError}
            helperText={helperText}
            autoComplete={autoComplete}
            slotProps={slotProps}
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
    startAdornment?: React.ReactNode;
    /** MUI TextField variant. Defaults to `outlined`. */
    variant?: 'outlined' | 'filled';
    className?: string;
    /** antd normalize hook (used by the number variant to coerce to a Number). */
    normalize?: (value: any, prevValue: any, allValues: any) => any;
}

/**
 * antd `Form.Item` (noStyle) wrapping a Material UI `TextField`.
 * Default variant is `outlined`; bind/validation via antd, presentation via MUI.
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
                        aria-pressed={visible}
                        data-testid="password-visibility-toggle"
                        onClick={() => setVisible((prev) => !prev)}
                        onMouseDown={(event) => event.preventDefault()}
                        edge="end"
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
