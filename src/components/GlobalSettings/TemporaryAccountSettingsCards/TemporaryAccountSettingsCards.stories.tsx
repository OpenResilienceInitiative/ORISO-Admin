import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- Storybook 10 subpath export.
import { expect, fn, userEvent, within } from 'storybook/test';
import { ThemeProvider } from '@mui/material/styles';
import { orisoMuiTheme } from '../../../theme/orisoMuiTheme';
import { TemporaryGuestAccountsSettingsCard, TemporaryMessagesSettingsCard } from '.';
import type { TemporaryAccountSettings } from '../../../types/TemporaryAccountSettings';

const defaults: TemporaryAccountSettings = {
    callDeleteAfterMinutes: 15,
    callMaxLifetimeHours: 24,
    chatInactivityDays: 30,
    hidePasswordField: false,
    messageRetention: 'GUEST_DECIDES',
    revision: 0,
};

const meta = {
    title: 'Organisms/GlobalSettings/TemporaryAccountSettingsCards',
    component: TemporaryGuestAccountsSettingsCard,
    decorators: [
        (Story) => (
            <ThemeProvider theme={orisoMuiTheme}>
                <div style={{ maxWidth: 400 }}>
                    <Story />
                </div>
            </ThemeProvider>
        ),
    ],
    args: { data: defaults, isLoading: false, isSaving: false, onSave: fn() },
} satisfies Meta<typeof TemporaryGuestAccountsSettingsCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const GuestAccountsDefault: Story = {};
export const GuestAccountsLoading: Story = { args: { data: undefined, isLoading: true } };
export const GuestAccountsLoadError: Story = { args: { data: undefined, error: new Error('network') } };

export const GuestAccountsSave: Story = {
    play: async ({ canvasElement, args }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByRole('button', { name: /edit|bearbeiten/i }));
        const chatDays = canvas.getAllByRole('spinbutton')[2];
        await userEvent.clear(chatDays);
        await userEvent.type(chatDays, '7');
        await userEvent.click(canvas.getByRole('switch'));
        await userEvent.click(canvas.getByRole('button', { name: /save|speichern/i }));
        await expect(args.onSave).toHaveBeenCalledWith(
            { ...defaults, chatInactivityDays: 7, hidePasswordField: true },
            expect.anything(),
        );
    },
};

export const GuestAccountsValidationError: Story = {
    play: async ({ canvasElement, args }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByRole('button', { name: /edit|bearbeiten/i }));
        const maxHours = canvas.getAllByRole('spinbutton')[1];
        await userEvent.clear(maxHours);
        await userEvent.type(maxHours, '25');
        await userEvent.click(canvas.getByRole('button', { name: /save|speichern/i }));
        await expect(await canvas.findByText(/1.*24/)).toBeVisible();
        await expect(args.onSave).not.toHaveBeenCalled();
    },
};

export const MessagesDefault: Story = { render: (args) => <TemporaryMessagesSettingsCard {...args} /> };
export const MessagesLoadError: Story = {
    args: { data: undefined, error: new Error('network') },
    render: (args) => <TemporaryMessagesSettingsCard {...args} />,
};
export const MessagesSave: Story = {
    render: (args) => <TemporaryMessagesSettingsCard {...args} />,
    play: async ({ canvasElement, args }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByRole('button', { name: /edit|bearbeiten/i }));
        await userEvent.click(canvas.getAllByRole('radio')[0]);
        await userEvent.click(canvas.getByRole('button', { name: /save|speichern/i }));
        await expect(args.onSave).toHaveBeenCalledWith(
            { ...defaults, messageRetention: 'ALWAYS_TEMPORARY' },
            expect.anything(),
        );
    },
};
