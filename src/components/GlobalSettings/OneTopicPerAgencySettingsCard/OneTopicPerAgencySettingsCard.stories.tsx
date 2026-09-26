import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- Storybook 10 subpath export.
import { expect, fn, userEvent, within } from 'storybook/test';
import { ThemeProvider } from '@mui/material/styles';
import { orisoMuiTheme } from '../../../theme/orisoMuiTheme';
import { OneTopicPerAgencySettingsCard } from '.';

/** ORISO-UserService#1264 (ADR-014 amendment 2026-09-25): global switch, default off. */
const meta = {
    title: 'Organisms/GlobalSettings/OneTopicPerAgencySettingsCard',
    component: OneTopicPerAgencySettingsCard,
    decorators: [
        (Story) => (
            <ThemeProvider theme={orisoMuiTheme}>
                <div style={{ maxWidth: 400 }}>
                    <Story />
                </div>
            </ThemeProvider>
        ),
    ],
    args: { enabled: false, isLoading: false, onSave: fn() },
} satisfies Meta<typeof OneTopicPerAgencySettingsCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Off: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByText('Eine Beratungsstelle hat genau einen Fachbereich')).toBeVisible();
        await expect(canvas.getByRole('switch', { name: /genau einen Fachbereich/ })).not.toBeChecked();
    },
};

export const On: Story = {
    args: { enabled: true },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByRole('switch', { name: /genau einen Fachbereich/ })).toBeChecked();
    },
};

export const SwitchOn: Story = {
    play: async ({ canvasElement, args }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByRole('button', { name: /edit|bearbeiten/i }));
        await userEvent.click(canvas.getByRole('switch', { name: /genau einen Fachbereich/ }));
        await userEvent.click(canvas.getByRole('button', { name: /save|speichern/i }));
        await expect(args.onSave).toHaveBeenCalledWith(true, expect.anything());
    },
};
