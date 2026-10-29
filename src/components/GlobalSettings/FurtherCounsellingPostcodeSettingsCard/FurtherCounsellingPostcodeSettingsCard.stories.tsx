import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- Storybook 10 subpath export.
import { expect, fn, userEvent, within } from 'storybook/test';
import { ThemeProvider } from '@mui/material/styles';
import { orisoMuiTheme } from '../../../theme/orisoMuiTheme';
import { FurtherCounsellingPostcodeSettingsCard } from '.';

/** ORISO-Frontend#1876: postcode prefill for further counselling, default Smart. */
const meta = {
    title: 'Organisms/GlobalSettings/FurtherCounsellingPostcodeSettingsCard',
    component: FurtherCounsellingPostcodeSettingsCard,
    decorators: [
        (Story) => (
            <ThemeProvider theme={orisoMuiTheme}>
                <div style={{ maxWidth: 400 }}>
                    <Story />
                </div>
            </ThemeProvider>
        ),
    ],
    args: { mode: 'SMART', isLoading: false, onSave: fn() },
} satisfies Meta<typeof FurtherCounsellingPostcodeSettingsCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Smart: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByText('PLZ bei weiterer Beratung')).toBeVisible();
        await expect(canvas.getByRole('radio', { name: /zuletzt eingegebene PLZ/ })).toBeChecked();
    },
};

export const AlwaysEmpty: Story = {
    args: { mode: 'ALWAYS_EMPTY' },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByRole('radio', { name: 'PLZ immer neu eingeben' })).toBeChecked();
    },
};

/** ORISO rule: superadmin-only settings are visible-but-disabled for everyone else. */
export const DisabledForNonSuperadmins: Story = {
    args: { disabled: true },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByRole('radio', { name: /zuletzt eingegebene PLZ/ })).toBeDisabled();
        await expect(canvas.queryByRole('button', { name: /edit|bearbeiten/i })).toBeNull();
    },
};

export const ChooseAlwaysEmpty: Story = {
    play: async ({ canvasElement, args }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByRole('button', { name: /edit|bearbeiten/i }));
        await userEvent.click(canvas.getByRole('radio', { name: 'PLZ immer neu eingeben' }));
        await userEvent.click(canvas.getByRole('button', { name: /save|speichern/i }));
        await expect(args.onSave).toHaveBeenCalledWith('ALWAYS_EMPTY', expect.anything());
    },
};
