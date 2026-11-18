import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- Storybook 10 subpath export.
import { expect, fn, userEvent, within } from 'storybook/test';
import { ThemeProvider } from '@mui/material/styles';
import { orisoMuiTheme } from '../../../theme/orisoMuiTheme';
import { CardGrid } from '../../CardGrid';
import { LiveChatFreeChoiceSettingsCard } from '.';

/** ORISO-Admin#1497: platform-wide live-chat queue rule, default strict order. */
const meta = {
    title: 'Settings/Einstellungen/Globale Konfigurationen/LiveChatFreeChoiceSettingsCard',
    id: 'organisms-globalsettings-livechatfreechoicesettingscard',
    component: LiveChatFreeChoiceSettingsCard,
    decorators: [
        (Story, { parameters }) => (
            <ThemeProvider theme={orisoMuiTheme}>
                <div style={{ maxWidth: parameters.tileWidth ?? 400 }}>
                    <Story />
                </div>
            </ThemeProvider>
        ),
    ],
    args: { enabled: false, isLoading: false, onSave: fn() },
} satisfies Meta<typeof LiveChatFreeChoiceSettingsCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Off: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByText('Beratende dürfen alle wartenden Ratsuchenden annehmen')).toBeVisible();
        await expect(canvas.getByRole('switch', { name: /alle wartenden Ratsuchenden/ })).not.toBeChecked();
    },
};

export const On: Story = {
    args: { enabled: true },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByRole('switch', { name: /alle wartenden Ratsuchenden/ })).toBeChecked();
    },
};

/** ORISO rule: superadmin-only settings are visible-but-disabled for everyone else. */
export const DisabledForNonSuperadmins: Story = {
    args: { enabled: true, disabled: true },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const freeChoiceSwitch = canvas.getByRole('switch', { name: /alle wartenden Ratsuchenden/ });
        await expect(freeChoiceSwitch).toBeChecked();
        await expect(freeChoiceSwitch).toHaveAttribute('aria-disabled', 'true');
        await expect(canvas.queryByRole('button', { name: /edit|bearbeiten/i })).toBeNull();
    },
};

export const SwitchOn: Story = {
    play: async ({ canvasElement, args }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByRole('button', { name: /edit|bearbeiten/i }));
        await userEvent.click(canvas.getByRole('switch', { name: /alle wartenden Ratsuchenden/ }));
        await userEvent.click(canvas.getByRole('button', { name: /save|speichern/i }));
        await expect(args.onSave).toHaveBeenCalledWith(true, expect.anything());
    },
};

/** As it sits on the page, beside a taller tile, so the free space shows. */
export const InTheRaster: Story = {
    parameters: { tileWidth: 'none' },
    render: (args) => (
        <CardGrid raster>
            <CardGrid.Item>
                <LiveChatFreeChoiceSettingsCard {...args} />
            </CardGrid.Item>
            <CardGrid.Item>
                <div style={{ height: 640 }} />
            </CardGrid.Item>
        </CardGrid>
    ),
};
