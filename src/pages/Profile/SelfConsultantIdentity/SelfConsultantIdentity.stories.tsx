import type { Meta, StoryObj } from '@storybook/react-vite';
import { CardGrid } from '../../../components/CardGrid';
import { profileUserDataHandlers } from '../../../test/profileUserData';
import { withRoles } from '../profileStory.matrix';
import { SelfConsultantIdentity } from './index';

const meta = {
    title: 'Settings/Mein Account/SelfConsultantIdentity',
    id: 'pages-profile-selfconsultantidentity',
    component: SelfConsultantIdentity,
    parameters: { layout: 'padded', msw: { handlers: profileUserDataHandlers } },
    decorators: [withRoles(['agency-admin', 'user-admin'])],
} satisfies Meta<typeof SelfConsultantIdentity>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** As it sits on the page; narrow the viewport to 390 px to see it stack. */
export const InTheRaster: Story = {
    parameters: { tileWidth: 'none' },
    // The tile brings its own raster cell.
    render: () => (
        <CardGrid raster>
            <SelfConsultantIdentity />
            <CardGrid.Item>
                <div style={{ height: 520 }} />
            </CardGrid.Item>
        </CardGrid>
    ),
};
