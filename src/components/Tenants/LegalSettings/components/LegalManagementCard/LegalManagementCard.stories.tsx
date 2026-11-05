import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { LegalManagementCard } from './index';

const meta = {
    title: 'Organisms/Legal/LegalManagementCard',
    component: LegalManagementCard,
    args: { allowEdit: true, allowed: false, onSave: () => {} },
    parameters: { layout: 'padded' },
} satisfies Meta<typeof LegalManagementCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Off: Story = {};

export const On: Story = { args: { allowed: true } };

export const ReadOnly: Story = {
    args: { allowEdit: false },
    play: async ({ canvasElement }) => {
        const toggle = within(canvasElement).getByRole('switch');
        await expect(toggle).toHaveAttribute('aria-disabled', 'true');
        toggle.focus();
        await expect(toggle).toHaveFocus();
        await userEvent.keyboard('[Space]');
        await expect(toggle).not.toBeChecked();
    },
};
