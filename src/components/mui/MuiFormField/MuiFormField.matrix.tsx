import * as React from 'react';
import { Form } from 'antd';
import ClearIcon from '@mui/icons-material/Clear';
import SearchIcon from '@mui/icons-material/Search';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import { ThemeProvider } from '@mui/material/styles';
// eslint-disable-next-line import/no-unresolved -- SB10 subpath export, invisible to the eslint import resolver
import { userEvent, within } from 'storybook/test';
import { orisoMuiTheme } from '../../../theme/orisoMuiTheme';
import { MuiFormField } from './index';

export type EndAdornmentProp = React.ReactNode | ((fieldName: string) => React.ReactNode);

export type MatrixFieldConfig = {
    variant: 'outlined' | 'filled';
    /** Always provided by matrix stories. */
    label: string;
    value?: string;
    placeholder?: string;
    /** Shown only when provided — same pattern as MUI `slotProps.input.startAdornment`. */
    startAdornment?: React.ReactNode;
    /** Shown only when provided — node or factory `(fieldName) => node` for per-field actions. */
    endAdornment?: EndAdornmentProp;
};

/** Leading search icon adornment (pass as `startAdornment` when needed). */
export const searchStartAdornment = (
    <InputAdornment position="start">
        <SearchIcon fontSize="small" />
    </InputAdornment>
);

/** Trailing clear button; needs the field name to clear that Form value. */
export const ClearEndAdornment = ({ fieldName }: { fieldName: string }) => {
    const form = Form.useFormInstance();
    return (
        <InputAdornment position="end">
            <IconButton
                aria-label="clear input"
                edge="end"
                size="small"
                onClick={() => form.setFieldValue(fieldName, '')}
                onMouseDown={(event) => event.preventDefault()}
            >
                <ClearIcon fontSize="small" />
            </IconButton>
        </InputAdornment>
    );
};

export const clearEndAdornment = (fieldName: string) => <ClearEndAdornment fieldName={fieldName} />;

const resolveEndAdornment = (endAdornment: EndAdornmentProp | undefined, fieldName: string) => {
    if (endAdornment == null) {
        return undefined;
    }
    return typeof endAdornment === 'function' ? endAdornment(fieldName) : endAdornment;
};

const StateColumn = ({ caption, children }: { caption: string; children: React.ReactNode }) => (
    <div style={{ flex: '1 1 0', minWidth: 168, maxWidth: 220 }}>
        {children}
        <div
            style={{
                marginTop: 8,
                textAlign: 'center',
                fontSize: 12,
                lineHeight: '16px',
                color: 'var(--admin-form-muted-text, #5f6368)',
                fontFamily: 'var(--m3-body-font-family)',
            }}
        >
            {caption}
        </div>
    </div>
);

/**
 * Five-state catalog row built on production {@link MuiFormField}.
 * Adornments render only when `startAdornment` / `endAdornment` are passed.
 */
export const FiveStateMatrix = ({ config }: { config: MatrixFieldConfig }) => {
    const [form] = Form.useForm();
    const { variant, label, value, placeholder, startAdornment, endAdornment } = config;

    React.useEffect(() => {
        form.setFields([{ name: 'error', errors: ['Incorrect entry.'] }]);
    }, [form]);

    const fieldProps = (fieldName: string) => ({
        variant,
        label,
        placeholder,
        ...(startAdornment != null ? { startAdornment } : {}),
        ...(endAdornment != null ? { endAdornment: resolveEndAdornment(endAdornment, fieldName) } : {}),
    });

    return (
        <ThemeProvider theme={orisoMuiTheme}>
            <Form
                form={form}
                layout="vertical"
                style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}
                initialValues={{
                    enabled: value,
                    focused: value,
                    hovered: value,
                    error: value,
                    disabled: value,
                }}
            >
                <StateColumn caption="Enabled">
                    <MuiFormField name="enabled" {...fieldProps('enabled')} />
                </StateColumn>
                <StateColumn caption="Focused">
                    <MuiFormField
                        name="focused"
                        {...fieldProps('focused')}
                        inputProps={{ autoFocus: true, 'data-testid': 'mui-form-field-focused' }}
                    />
                </StateColumn>
                <StateColumn caption="Hovered">
                    <MuiFormField name="hovered" {...fieldProps('hovered')} className="pseudo-hover" />
                </StateColumn>
                <StateColumn caption="Error">
                    <MuiFormField name="error" {...fieldProps('error')} />
                </StateColumn>
                <StateColumn caption="Disabled">
                    <MuiFormField name="disabled" {...fieldProps('disabled')} disabled />
                </StateColumn>
            </Form>
        </ThemeProvider>
    );
};

export const focusPlay = async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const canvas = within(canvasElement);
    const input = await canvas.findByTestId('mui-form-field-focused');
    await userEvent.click(input);
    input.focus();
};
