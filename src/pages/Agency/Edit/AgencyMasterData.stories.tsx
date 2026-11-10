import type { Meta, StoryObj } from '@storybook/react-vite';
import { AgencyEditFrame, agencyEditHandlers, installAgencyStoryAuth } from './agencyEditStoryHarness.matrix';

/**
 * Beratungsstelle > Stammdaten (`/admin/agency/:id/general`): the real page, HTTP mocked.
 */
const meta = {
    title: 'Admin/Agency/Master data',
    component: AgencyEditFrame,
    parameters: { layout: 'fullscreen', msw: { handlers: agencyEditHandlers } },
    render: () => <AgencyEditFrame />,
} satisfies Meta<typeof AgencyEditFrame>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PlatformAdmin: Story = { beforeEach: () => installAgencyStoryAuth('platformAdmin') };
export const TraegerAdmin: Story = { beforeEach: () => installAgencyStoryAuth('traegerAdmin') };
export const AgencyAdmin: Story = { beforeEach: () => installAgencyStoryAuth('agencyAdmin') };
