import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { EditingRightsCard } from './index';
import { inTheRaster, withAppearanceData } from '../appearanceStoryHarness.matrix';

const meta = {
    title: 'Organisms/Tenants/Appearance/EditingRightsCard',
    component: EditingRightsCard,
    args: { allowEdit: true, editable: true, onSave: () => {} },
    parameters: { layout: 'padded' },
    decorators: [(Story) => inTheRaster(Story), withAppearanceData],
} satisfies Meta<typeof EditingRightsCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const InTheRaster: Story = {};

export const OffForOrganisationAdmins: Story = { args: { editable: false } };

export const ReadOnly: Story = {
    args: { allowEdit: false },
    play: async ({ canvasElement }) => {
        const toggle = within(canvasElement).getByRole('switch');
        await expect(toggle).toHaveAttribute('aria-disabled', 'true');
        toggle.focus();
        await expect(toggle).toHaveFocus();
        await userEvent.keyboard('[Space]');
        await expect(toggle).toBeChecked();
    },
};
