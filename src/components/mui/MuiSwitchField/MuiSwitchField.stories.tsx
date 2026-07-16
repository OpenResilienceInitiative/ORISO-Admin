import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Form } from 'antd';
import { ThemeProvider } from '@mui/material/styles';
import { orisoMuiTheme } from '../../../theme/orisoMuiTheme';
import { MuiSwitchField } from './index';

const withMuiForm = (children: React.ReactNode, options?: { initialValues?: Record<string, unknown> }) => (
    <ThemeProvider theme={orisoMuiTheme}>
        <Form layout="vertical" style={{ maxWidth: 420 }} initialValues={options?.initialValues}>
            {children}
        </Form>
    </ThemeProvider>
);

const meta = {
    title: 'Atoms/MuiSwitchField',
    component: MuiSwitchField,
    parameters: { layout: 'padded' },
    args: {
        name: 'enabled',
        label: 'Enable SMTP',
        switchLabel: 'Enable SMTP',
    },
} satisfies Meta<typeof MuiSwitchField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    render: (args) => withMuiForm(<MuiSwitchField {...args} />),
};

export const Checked: Story = {
    render: (args) => withMuiForm(<MuiSwitchField {...args} />, { initialValues: { enabled: true } }),
};

export const DisabledUnchecked: Story = {
    args: {
        disabled: true,
    },
    render: (args) => withMuiForm(<MuiSwitchField {...args} />),
};

export const DisabledChecked: Story = {
    args: {
        disabled: true,
    },
    render: (args) => withMuiForm(<MuiSwitchField {...args} />, { initialValues: { enabled: true } }),
};

export const WithHelpText: Story = {
    args: {
        helpText: 'When enabled, the platform sends mail through the global SMTP settings.',
    },
    render: (args) => withMuiForm(<MuiSwitchField {...args} />),
};

const ErrorDemo = () => {
    const [form] = Form.useForm();

    React.useEffect(() => {
        form.setFields([{ name: 'enabled', errors: ['This setting is required'] }]);
    }, [form]);

    return (
        <ThemeProvider theme={orisoMuiTheme}>
            <Form form={form} layout="vertical" style={{ maxWidth: 420 }}>
                <MuiSwitchField name="enabled" label="Enable SMTP" switchLabel="Enable SMTP" />
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
        form.setFields([{ name: 'error', errors: ['This setting is required'] }]);
    }, [form]);

    return (
        <ThemeProvider theme={orisoMuiTheme}>
            <Form
                form={form}
                layout="vertical"
                style={{ display: 'grid', gap: 16, maxWidth: 720, gridTemplateColumns: '1fr 1fr' }}
                initialValues={{
                    checked: true,
                    disabledChecked: true,
                }}
            >
                <MuiSwitchField name="unchecked" label="Default (unchecked)" switchLabel="Default (unchecked)" />
                <MuiSwitchField name="checked" label="Checked" switchLabel="Checked" />
                <MuiSwitchField
                    name="disabledUnchecked"
                    label="Disabled unchecked"
                    switchLabel="Disabled unchecked"
                    disabled
                />
                <MuiSwitchField
                    name="disabledChecked"
                    label="Disabled checked"
                    switchLabel="Disabled checked"
                    disabled
                />
                <MuiSwitchField
                    name="help"
                    label="With help text"
                    switchLabel="With help text"
                    helpText="Helper copy under the switch"
                />
                <MuiSwitchField name="error" label="Error" switchLabel="Error" />
            </Form>
        </ThemeProvider>
    );
};

export const AllStates: Story = {
    render: () => <AllStatesDemo />,
};
