import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- Storybook 10 subpath export.
import { expect, fn, userEvent, within } from 'storybook/test';
import { ThemeProvider } from '@mui/material/styles';
import { orisoMuiTheme } from '../../../theme/orisoMuiTheme';
import { AccountInactivitySettingsCard } from '.';

const meta = {
    title: 'Organisms/GlobalSettings/AccountInactivitySettingsCard',
    component: AccountInactivitySettingsCard,
    decorators: [
        (Story) => (
            <ThemeProvider theme={orisoMuiTheme}>
                <div style={{ maxWidth: 400 }}>
                    <Story />
                </div>
            </ThemeProvider>
        ),
    ],
    args: {
        data: { askerMonths: 24, consultantMonths: 24, otherMonths: 24, revision: 0 },
        isLoading: false,
        isSaving: false,
        onSave: fn(),
    },
} satisfies Meta<typeof AccountInactivitySettingsCard>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Loading: Story = { args: { data: undefined, isLoading: true } };
export const LoadError: Story = { args: { data: undefined, error: new Error('network') } };
export const Editable: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByRole('button', { name: /edit|bearbeiten/i }));
        await expect(canvas.getAllByRole('spinbutton')[0]).toBeEnabled();
    },
};

export const SavePeriod: Story = {
    play: async ({ canvasElement, args }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByRole('button', { name: /edit|bearbeiten/i }));
        const asker = canvas.getAllByRole('spinbutton')[0];
        await userEvent.clear(asker);
        await userEvent.type(asker, '12');
        await userEvent.click(canvas.getByRole('button', { name: /save|speichern/i }));
        await expect(args.onSave).toHaveBeenCalledWith(
            { askerMonths: 12, consultantMonths: 24, otherMonths: 24, revision: 0 },
            expect.anything(),
        );
    },
};
