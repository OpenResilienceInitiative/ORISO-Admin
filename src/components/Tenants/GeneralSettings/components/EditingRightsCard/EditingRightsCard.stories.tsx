import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- Storybook's subpath export is invisible to the eslint resolver
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { EditingRightsCard } from './index';
import { inTheRaster, withAppearanceData } from '../appearanceStoryHarness.matrix';
import { expectReadOnlyTile } from '../../../../CardEditable/readOnlyTileStory.matrix';

const meta = {
    title: 'Settings/Einstellungen/Stammdaten & Mehr/EditingRightsCard',
    id: 'organisms-tenants-appearance-editingrightscard',
    component: EditingRightsCard,
    args: { allowEdit: true, editable: true, onSave: () => {} },
    parameters: { layout: 'padded' },
    decorators: [(Story) => inTheRaster(Story), withAppearanceData],
} satisfies Meta<typeof EditingRightsCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The appearance editing right shows its state as a word next to the switch (#1374). */
export const InTheRaster: Story = {
    play: async ({ canvasElement }) => {
        await waitFor(() => expect(within(canvasElement).getByText(/^(An|On)$/)).toBeVisible());
    },
};

export const OffForOrganisationAdmins: Story = {
    args: { editable: false },
    play: async ({ canvasElement }) => {
        await waitFor(() => expect(within(canvasElement).getByText(/^(Aus|Off)$/)).toBeVisible());
    },
};

export const ReadOnly: Story = {
    args: { allowEdit: false, readOnlyAccess: true },
    play: async ({ canvasElement }) => {
        // Read access only: the edit action stays, locked, and the tile names who can change it (#1374).
        await expectReadOnlyTile(canvasElement, /nur Plattform-Admins|Only platform admins/);
        const toggle = within(canvasElement).getByRole('switch');
        await expect(toggle).toHaveAttribute('aria-disabled', 'true');
        toggle.focus();
        await expect(toggle).toHaveFocus();
        await userEvent.keyboard('[Space]');
        await expect(toggle).toBeChecked();
    },
};
