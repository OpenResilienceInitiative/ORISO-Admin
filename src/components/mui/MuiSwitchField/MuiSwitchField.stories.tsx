import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- Storybook's subpath export is invisible to the eslint resolver
import { expect, userEvent, within } from 'storybook/test';
import { Form } from 'antd';
import { ThemeProvider } from '@mui/material/styles';
import { orisoMuiTheme } from '../../../theme/orisoMuiTheme';
import { MuiSwitchField } from './index';
import { ReadOnlyTileContext } from '../../CardEditable/ReadOnlyTileContext';

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

/** View-only values stay readable and can be reached with the keyboard. */
export const ReadOnlyChecked: Story = {
    render: (args) => (
        <ThemeProvider theme={orisoMuiTheme}>
            <ReadOnlyTileContext.Provider value>
                <Form disabled layout="vertical" style={{ maxWidth: 420 }} initialValues={{ enabled: true }}>
                    <MuiSwitchField {...args} />
                </Form>
            </ReadOnlyTileContext.Provider>
        </ThemeProvider>
    ),
    play: async ({ canvasElement }) => {
        const toggle = within(canvasElement).getByRole('switch', { name: 'Enable SMTP' });
        const switchBase = toggle.closest('.MuiSwitch-switchBase')!;
        await expect(toggle).toHaveAttribute('aria-disabled', 'true');
        await userEvent.hover(toggle);
        await expect(getComputedStyle(switchBase).backgroundColor).toBe('rgba(0, 0, 0, 0)');
    },
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
                <MuiSwitchField name="unchecked" label="Off — X icon in thumb" switchLabel="Off — X icon in thumb" />
                <MuiSwitchField
                    name="checked"
                    label="On — check icon in thumb"
                    switchLabel="On — check icon in thumb"
                />
                <MuiSwitchField
                    name="disabledUnchecked"
                    label="Disabled off (X icon)"
                    switchLabel="Disabled off (X icon)"
                    disabled
                />
                <MuiSwitchField
                    name="disabledChecked"
                    label="Disabled on (check icon)"
                    switchLabel="Disabled on (check icon)"
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

/** „An“/„Aus“ next to the switch (#1374). */
export const StateLabelOff: Story = {
    args: { showStateLabel: true, label: 'Rundgänge in Hilfe', switchLabel: 'Rundgänge in Hilfe' },
    render: (args) => withMuiForm(<MuiSwitchField {...args} />, { initialValues: { enabled: false } }),
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await expect(canvas.getByRole('switch', { name: 'Rundgänge in Hilfe' })).not.toBeChecked();
        await expect(canvas.getByText(/^(Aus|Off)$/)).toBeVisible();
    },
};

/** The word follows the bound value when the switch is toggled. */
export const StateLabelToggles: Story = {
    args: { showStateLabel: true, label: 'Rundgänge in Hilfe', switchLabel: 'Rundgänge in Hilfe' },
    render: (args) => withMuiForm(<MuiSwitchField {...args} />, { initialValues: { enabled: false } }),
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await expect(canvas.getByText(/^(Aus|Off)$/)).toBeVisible();
        await userEvent.click(canvas.getByRole('switch', { name: 'Rundgänge in Hilfe' }));
        await expect(canvas.getByText(/^(An|On)$/)).toBeVisible();
    },
};

export const StateLabelOn: Story = {
    args: { showStateLabel: true, label: 'Rundgänge in Hilfe', switchLabel: 'Rundgänge in Hilfe' },
    render: (args) => withMuiForm(<MuiSwitchField {...args} />, { initialValues: { enabled: true } }),
    play: async ({ canvasElement }) => {
        await expect(within(canvasElement).getByText(/^(An|On)$/)).toBeVisible();
    },
};

export const StateLabelDisabled: Story = {
    args: { showStateLabel: true, disabled: true, label: 'Rundgänge in Hilfe', switchLabel: 'Rundgänge in Hilfe' },
    render: (args) => withMuiForm(<MuiSwitchField {...args} />, { initialValues: { enabled: true } }),
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await expect(canvas.getByRole('switch', { name: 'Rundgänge in Hilfe' })).toBeDisabled();
        await expect(canvas.getByText(/^(An|On)$/)).toBeVisible();
    },
};
