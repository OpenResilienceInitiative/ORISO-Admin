import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- Storybook 10 subpath export.
import { expect, fn, userEvent, within } from 'storybook/test';
import { ThemeProvider } from '@mui/material/styles';
import { orisoMuiTheme } from '../../../theme/orisoMuiTheme';
import { SupportEmailSettingsCard } from '.';

/** ORISO-Frontend#1915: fallback support address when a counselling centre has no chat-reachable admin. */
const meta = {
    title: 'Organisms/GlobalSettings/SupportEmailSettingsCard',
    component: SupportEmailSettingsCard,
    decorators: [
        (Story) => (
            <ThemeProvider theme={orisoMuiTheme}>
                <div style={{ maxWidth: 400 }}>
                    <Story />
                </div>
            </ThemeProvider>
        ),
    ],
    args: { value: '', isLoading: false, onSave: fn() },
} satisfies Meta<typeof SupportEmailSettingsCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const NotConfigured: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByLabelText('Support-E-Mail-Adresse')).toHaveValue('');
    },
};

export const Configured: Story = {
    args: { value: 'support@example.org' },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByLabelText('Support-E-Mail-Adresse')).toHaveValue('support@example.org');
    },
};

/** ORISO rule: superadmin-only settings are visible-but-disabled for everyone else. */
export const DisabledForNonSuperadmins: Story = {
    args: { value: 'support@example.org', disabled: true },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByLabelText('Support-E-Mail-Adresse')).toBeDisabled();
        await expect(canvas.queryByRole('button', { name: /edit|bearbeiten/i })).toBeNull();
    },
};

export const InvalidAddress: Story = {
    play: async ({ canvasElement, args }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByRole('button', { name: /edit|bearbeiten/i }));
        await userEvent.type(canvas.getByLabelText('Support-E-Mail-Adresse'), 'kein-email');
        await userEvent.click(canvas.getByRole('button', { name: /save|speichern/i }));
        await expect(await canvas.findByText('Die E-Mail-Adresse ist nicht gültig.')).toBeVisible();
        await expect(args.onSave).not.toHaveBeenCalled();
    },
};
