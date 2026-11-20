import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- Storybook's subpath export is invisible to the eslint resolver
import { expect, userEvent, within } from 'storybook/test';
import { expectReadOnlyTile } from '../../../../CardEditable/readOnlyTileStory.matrix';
import { LegalManagementCard } from './index';

const meta = {
    title: 'Settings/Einstellungen/Rechtliches/LegalManagementCard',
    id: 'organisms-legal-legalmanagementcard',
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
        // Read access only: the edit action stays, locked, and the tile names who can change it (#1374).
        await expectReadOnlyTile(canvasElement, /nur Plattform-Admins|Only platform admins/);
        const toggle = within(canvasElement).getByRole('switch');
        await expect(toggle).toHaveAttribute('aria-disabled', 'true');
        toggle.focus();
        await expect(toggle).toHaveFocus();
        await userEvent.keyboard('[Space]');
        await expect(toggle).not.toBeChecked();
    },
};
