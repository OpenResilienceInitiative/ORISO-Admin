import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- Storybook's subpath export is invisible to the eslint resolver
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
    args: { allowEdit: false, readOnlyAccess: true },
    play: async ({ canvasElement }) => {
        // Read access only: the edit action stays, locked, instead of disappearing (#1374).
        await expect(within(canvasElement).getByRole('button', { name: /bearbeiten|edit/i })).toHaveAttribute(
            'aria-disabled',
            'true',
        );
        const toggle = within(canvasElement).getByRole('switch');
        await expect(toggle).toHaveAttribute('aria-disabled', 'true');
        toggle.focus();
        await expect(toggle).toHaveFocus();
        await userEvent.keyboard('[Space]');
        await expect(toggle).toBeChecked();
    },
};
