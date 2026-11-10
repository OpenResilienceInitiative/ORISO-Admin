import type { Meta, StoryObj } from '@storybook/react-vite';
import { AgencyEditFrame, agencyEditHandlers, installAgencyStoryAuth } from './agencyEditStoryHarness.matrix';

/**
 * Beratungsstelle > Funktionszugriff (`/admin/agency/:id/functionalities`): the real page, HTTP mocked.
 */
const meta = {
    title: 'Admin/Agency/Function access',
    component: AgencyEditFrame,
    parameters: { layout: 'fullscreen', msw: { handlers: agencyEditHandlers } },
    render: () => <AgencyEditFrame section="functionalities" />,
} satisfies Meta<typeof AgencyEditFrame>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PlatformAdmin: Story = { beforeEach: () => installAgencyStoryAuth('platformAdmin') };
export const AgencyAdmin: Story = { beforeEach: () => installAgencyStoryAuth('agencyAdmin') };
