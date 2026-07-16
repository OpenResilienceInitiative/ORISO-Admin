import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Form } from 'antd';
import { ThemeProvider } from '@mui/material/styles';
import { orisoMuiTheme } from '../../../theme/orisoMuiTheme';
import { MuiNumberFormField } from './index';

const withMuiForm = (children: React.ReactNode, options?: { initialValues?: Record<string, unknown> }) => (
    <ThemeProvider theme={orisoMuiTheme}>
        <Form layout="vertical" style={{ maxWidth: 360 }} initialValues={options?.initialValues}>
            {children}
        </Form>
    </ThemeProvider>
);

const meta = {
    title: 'Atoms/MuiNumberFormField',
    component: MuiNumberFormField,
    parameters: { layout: 'padded' },
    args: {
        name: 'port',
        label: 'SMTP port',
    },
} satisfies Meta<typeof MuiNumberFormField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    render: (args) => withMuiForm(<MuiNumberFormField {...args} />),
};

export const WithValue: Story = {
    render: (args) => withMuiForm(<MuiNumberFormField {...args} />, { initialValues: { port: 587 } }),
};

export const WithMin: Story = {
    args: {
        min: 1,
        label: 'Allowed users',
        name: 'allowedUsers',
    },
    render: (args) => withMuiForm(<MuiNumberFormField {...args} />, { initialValues: { allowedUsers: 5 } }),
};

export const Disabled: Story = {
    args: {
        disabled: true,
    },
    render: (args) => withMuiForm(<MuiNumberFormField {...args} />, { initialValues: { port: 587 } }),
};

const ErrorDemo = () => {
    const [form] = Form.useForm();

    React.useEffect(() => {
        form.setFields([{ name: 'port', errors: ['Port must be a number'] }]);
    }, [form]);

    return (
        <ThemeProvider theme={orisoMuiTheme}>
            <Form form={form} layout="vertical" style={{ maxWidth: 360 }}>
                <MuiNumberFormField name="port" label="SMTP port" />
            </Form>
        </ThemeProvider>
    );
};

export const Error: Story = {
    name: 'Error state',
    render: () => <ErrorDemo />,
};

const AllStatesDemo = () => {
    const [form] = Form.useForm();

    React.useEffect(() => {
        form.setFields([{ name: 'error', errors: ['Port must be a number'] }]);
    }, [form]);

    return (
        <ThemeProvider theme={orisoMuiTheme}>
            <Form
                form={form}
                layout="vertical"
                style={{ display: 'grid', gap: 16, maxWidth: 720, gridTemplateColumns: '1fr 1fr' }}
                initialValues={{
                    filled: 587,
                    withMin: 5,
                    disabled: 465,
                }}
            >
                <MuiNumberFormField name="empty" label="Default (empty)" />
                <MuiNumberFormField name="filled" label="With value" />
                <MuiNumberFormField name="withMin" label="With min" min={1} />
                <MuiNumberFormField name="disabled" label="Disabled" disabled />
                <MuiNumberFormField name="error" label="Error" />
            </Form>
        </ThemeProvider>
    );
};

export const AllStates: Story = {
    render: () => <AllStatesDemo />,
};
