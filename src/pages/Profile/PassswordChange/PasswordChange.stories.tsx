import type { Meta, StoryObj } from '@storybook/react-vite';
import { profileUserDataHandlers } from '../../../test/profileUserData';
import { inTheRaster, withRoles } from '../profileStory';
import { PasswordChange } from './index';

const meta = {
    title: 'Pages/Profile/PasswordChange',
    component: PasswordChange,
    parameters: { layout: 'padded', msw: { handlers: profileUserDataHandlers } },
    decorators: [withRoles(['agency-admin'])],
} satisfies Meta<typeof PasswordChange>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** As it sits on the page; narrow the viewport to 390 px to see it stack. */
export const InTheRaster: Story = {
    parameters: { tileWidth: 'none' },
    render: () => inTheRaster(() => <PasswordChange />),
};
