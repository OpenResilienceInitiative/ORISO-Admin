import type { Meta, StoryObj } from '@storybook/react-vite';
import { profileUserDataHandlers } from '../../../test/profileUserData';
import { inTheRaster, withRoles } from '../profileStory.matrix';
import { RolesAndAssignment } from './index';

const meta = {
    title: 'Settings/Mein Account/RolesAndAssignment',
    id: 'pages-profile-rolesandassignment',
    component: RolesAndAssignment,
    parameters: { layout: 'padded', msw: { handlers: profileUserDataHandlers } },
    decorators: [withRoles(['agency-admin', 'user-admin', 'consultant'])],
} satisfies Meta<typeof RolesAndAssignment>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** As it sits on the page; narrow the viewport to 390 px to see it stack. */
export const InTheRaster: Story = {
    parameters: { tileWidth: 'none' },
    render: () => inTheRaster(() => <RolesAndAssignment />),
};
