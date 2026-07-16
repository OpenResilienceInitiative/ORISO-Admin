import type { Meta, StoryObj } from '@storybook/react-vite';
import { CreateConsultantModal } from './index';

const meta = {
    title: 'Organisms/CreateConsultantModal',
    component: CreateConsultantModal,
    parameters: { layout: 'padded' },
    args: {
        onSuccess: () => {},
    },
} satisfies Meta<typeof CreateConsultantModal>;

export default meta;
type Story = StoryObj<typeof meta>;

/** No tenant selected yet: trigger button disabled, tooltip explains why. */
export const NoTenantSelected: Story = {
    args: {
        tenantId: undefined,
    },
};

/** Tenant known: trigger button is active. Click it to open the create-consultant form. */
export const TenantSelected: Story = {
    args: {
        tenantId: 42,
    },
};
