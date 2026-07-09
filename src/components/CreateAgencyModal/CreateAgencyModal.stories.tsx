import type { Meta, StoryObj } from '@storybook/react-vite';
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
