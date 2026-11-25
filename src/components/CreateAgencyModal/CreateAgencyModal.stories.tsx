import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- Storybook 10 subpath export, invisible to the eslint import resolver
import { expect, userEvent, within } from 'storybook/test';
import { popupsOf } from '../../test/storyPopups';
import { CreateAgencyModal } from './index';

const meta = {
    title: 'Organisms/CreateAgencyModal',
    component: CreateAgencyModal,
    parameters: { layout: 'padded' },
    args: {
        onSuccess: () => {},
    },
} satisfies Meta<typeof CreateAgencyModal>;

export default meta;
type Story = StoryObj<typeof meta>;

/** No tenant selected yet: trigger button disabled, tooltip explains why. */
export const NoTenantSelected: Story = {
    args: {
        tenantId: undefined,
    },
};

/** Tenant known: trigger button is active. Click it to open the create-agency form. */
export const TenantSelected: Story = {
    args: {
        tenantId: 42,
    },
};

/**
 * U3: the opened form explains in plain text that the new centre starts invisible in the registration.
 * It is a permanent explanation: text inside the dialog, no box and no pop-up.
 */
export const OfflineHintInForm: Story = {
    args: { tenantId: 42 },
    play: async ({ canvasElement }) => {
        await userEvent.click(within(canvasElement).getByRole('button', { name: /Neue Beratungsstelle anlegen/ }));
        const body = within(canvasElement.ownerDocument.body);
        await expect(await body.findByText(/zunächst in der Registrierung unsichtbar/)).toBeInTheDocument();
        await expect(popupsOf(canvasElement)).toHaveLength(0);
    },
};
