import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- Storybook 10 subpath export.
import { expect, fn, userEvent, within } from 'storybook/test';
import { ThemeProvider } from '@mui/material/styles';
import { orisoMuiTheme } from '../../../theme/orisoMuiTheme';
import { TopicDuplicateSettingsCard } from '.';

/** ORISO-Frontend#1876: only "inform the existing counsellor once" is live; the rest come with #1878. */
const meta = {
    title: 'Organisms/GlobalSettings/TopicDuplicateSettingsCard',
    component: TopicDuplicateSettingsCard,
    decorators: [
        (Story) => (
            <ThemeProvider theme={orisoMuiTheme}>
                <div style={{ maxWidth: 400 }}>
                    <Story />
                </div>
            </ThemeProvider>
        ),
    ],
    args: { isLoading: false, onSave: fn() },
} satisfies Meta<typeof TopicDuplicateSettingsCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByText('Themendopplung')).toBeVisible();
        await expect(canvas.getByRole('radio', { name: 'Bisherige Berater:in einmal informieren' })).toBeChecked();
    },
};

export const Editing: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByRole('button', { name: /edit|bearbeiten/i }));
        const radios = canvas.getAllByRole('radio');
        await expect(radios).toHaveLength(4);
        await expect(radios[0]).toBeEnabled();
        await Promise.all(radios.slice(1).map((radio) => expect(radio).toBeDisabled()));
    },
};

/** ORISO rule: superadmin-only settings are visible-but-disabled for everyone else. */
export const DisabledForNonSuperadmins: Story = {
    args: { disabled: true },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByRole('radio', { name: 'Bisherige Berater:in einmal informieren' })).toBeDisabled();
        await expect(canvas.queryByRole('button', { name: /edit|bearbeiten/i })).toBeNull();
    },
};
