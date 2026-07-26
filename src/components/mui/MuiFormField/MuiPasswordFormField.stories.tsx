import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Form } from 'antd';
import { ThemeProvider } from '@mui/material/styles';
// eslint-disable-next-line import/no-unresolved -- SB10 subpath export, invisible to the eslint import resolver
import { expect, userEvent, within } from 'storybook/test';
import { orisoMuiTheme } from '../../../theme/orisoMuiTheme';
import { MuiPasswordFormField } from './index';

const withMuiForm = (children: React.ReactNode, options?: { initialValues?: Record<string, unknown> }) => (
    <ThemeProvider theme={orisoMuiTheme}>
        <Form layout="vertical" style={{ maxWidth: 360 }} initialValues={options?.initialValues}>
            {children}
        </Form>
    </ThemeProvider>
);

const meta = {
    title: 'Atoms/MuiPasswordFormField',
    component: MuiPasswordFormField,
    parameters: { layout: 'padded' },
    args: {
        name: 'password',
        label: 'Password',
    },
} satisfies Meta<typeof MuiPasswordFormField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    render: (args) => withMuiForm(<MuiPasswordFormField {...args} />),
};

export const WithValue: Story = {
    render: (args) => withMuiForm(<MuiPasswordFormField {...args} />, { initialValues: { password: 'super-secret' } }),
};

export const ToggleVisibility: Story = {
    render: (args) => withMuiForm(<MuiPasswordFormField {...args} />, { initialValues: { password: 'super-secret' } }),
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const input = canvas.getByLabelText('Password');
        const toggle = canvas.getByRole('button', { name: 'toggle password visibility' });

        expect(input).toHaveAttribute('type', 'password');
        expect(toggle).toHaveAttribute('aria-pressed', 'false');

        await userEvent.click(toggle);
        expect(input).toHaveAttribute('type', 'text');
        expect(toggle).toHaveAttribute('aria-pressed', 'true');

        await userEvent.click(toggle);
        expect(input).toHaveAttribute('type', 'password');
        expect(toggle).toHaveAttribute('aria-pressed', 'false');
    },
};

export const Disabled: Story = {
    args: {
        disabled: true,
    },
    render: (args) => withMuiForm(<MuiPasswordFormField {...args} />, { initialValues: { password: 'super-secret' } }),
};

const ErrorDemo = () => {
    const [form] = Form.useForm();

    React.useEffect(() => {
        form.setFields([{ name: 'password', errors: ['Password is required'] }]);
    }, [form]);

    return (
        <ThemeProvider theme={orisoMuiTheme}>
            <Form form={form} layout="vertical" style={{ maxWidth: 360 }} initialValues={{ password: 'short' }}>
                <MuiPasswordFormField name="password" label="Password" />
            </Form>
        </ThemeProvider>
    );
};

export const Error: Story = {
    name: 'Error state with visibility toggle',
    render: () => <ErrorDemo />,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const input = canvas.getByLabelText('Password');
        const toggle = canvas.getByRole('button', { name: 'toggle password visibility' });
        const errorIcon = canvas.getByTestId('mui-form-field-error-icon');

        expect(canvas.getByText('Password is required')).toBeVisible();
        expect(errorIcon).toBeVisible();
        expect(toggle).toBeVisible();
        expect(input).toHaveAttribute('type', 'password');

        await userEvent.click(toggle);
        expect(input).toHaveAttribute('type', 'text');
        expect(errorIcon).toBeVisible();
        expect(toggle).toHaveAttribute('aria-pressed', 'true');
    },
};

const AllStatesDemo = () => {
    const [form] = Form.useForm();

    React.useEffect(() => {
        form.setFields([{ name: 'error', errors: ['Password is required'] }]);
    }, [form]);

    return (
        <ThemeProvider theme={orisoMuiTheme}>
            <Form
                form={form}
                layout="vertical"
                style={{ display: 'grid', gap: 16, maxWidth: 720, gridTemplateColumns: '1fr 1fr' }}
                initialValues={{
                    filled: 'super-secret',
                    disabled: 'super-secret',
                    error: 'short',
                }}
            >
                <MuiPasswordFormField name="empty" label="Default (empty)" />
                <MuiPasswordFormField name="filled" label="With value" />
                <MuiPasswordFormField name="disabled" label="Disabled" disabled />
                <MuiPasswordFormField name="error" label="Error (toggle + error icon)" />
            </Form>
        </ThemeProvider>
    );
};

export const AllStates: Story = {
    render: () => <AllStatesDemo />,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        expect(canvas.getByText('Password is required')).toBeVisible();
        expect(canvas.getByTestId('mui-form-field-error-icon')).toBeVisible();
        // Empty, filled, disabled, and error fields each keep a visibility toggle.
        expect(canvas.getAllByRole('button', { name: 'toggle password visibility' })).toHaveLength(4);
    },
};
