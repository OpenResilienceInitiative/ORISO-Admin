import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- Storybook 10 subpath export is not resolved by ESLint 7.
import { expect, fn, userEvent, within } from 'storybook/test';
import { ChatRecoverySettingsCard } from '.';

const meta = {
    title: 'Organisms/GlobalSettings/ChatRecoverySettingsCard',
    component: ChatRecoverySettingsCard,
    args: {
        data: { asker: 'LOGIN_PASSWORD', consultant: 'LOGIN_PASSWORD', revision: 1 },
        isLoading: false,
        isSaving: false,
        onSave: fn(),
    },
} satisfies Meta<typeof ChatRecoverySettingsCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Loading: Story = { args: { data: undefined, isLoading: true } };

export const LoadError: Story = { args: { data: undefined, error: new Error('network') } };

export const Editable: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByRole('button', { name: /edit/i }));
        await expect(canvas.getAllByRole('combobox')[0]).toBeEnabled();
    },
};
