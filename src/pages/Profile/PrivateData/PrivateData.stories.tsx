import type { Meta, StoryObj } from '@storybook/react-vite';
import { profileUserDataHandlers } from '../../../test/profileUserData';
import { inTheRaster, withRoles } from '../profileStory';
import { PrivateData } from './index';

const meta = {
    title: 'Pages/Profile/PrivateData',
    component: PrivateData,
    parameters: { layout: 'padded', msw: { handlers: profileUserDataHandlers } },
    decorators: [withRoles(['agency-admin'])],
} satisfies Meta<typeof PrivateData>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** As it sits on the page; narrow the viewport to 390 px to see it stack. */
export const InTheRaster: Story = {
    parameters: { tileWidth: 'none' },
    render: () => inTheRaster(() => <PrivateData />),
};
