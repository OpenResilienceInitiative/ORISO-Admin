import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- SB10 subpath export, invisible to the eslint import resolver
import { expect, within } from 'storybook/test';
import { AgencyEditFrame, agencyEditHandlers, installAgencyStoryAuth } from './agencyEditStoryHarness.matrix';

/**
 * Beratungsstelle > Stammdaten (`/admin/agency/:id/general`): the real page, HTTP mocked.
 */
const meta = {
    title: 'Settings/Beratungsstellen/Stammdaten & Mehr/Ganze Seite',
    id: 'admin-agency-master-data',
    component: AgencyEditFrame,
    parameters: { layout: 'fullscreen', msw: { handlers: agencyEditHandlers } },
    render: () => <AgencyEditFrame />,
} satisfies Meta<typeof AgencyEditFrame>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PlatformAdmin: Story = { beforeEach: () => installAgencyStoryAuth('platformAdmin') };
export const TraegerAdmin: Story = { beforeEach: () => installAgencyStoryAuth('traegerAdmin') };
export const AgencyAdmin: Story = { beforeEach: () => installAgencyStoryAuth('agencyAdmin') };

/**
 * The header shows the whole name of the centre ("Beratungsstelle Nordlicht", 25 characters). The page used to cut
 * it after 10 characters ("Beratungss...") however much room there was (ORISO-Admin#1543).
 */
export const FullNameInHeader: Story = {
    beforeEach: () => installAgencyStoryAuth('platformAdmin'),
    play: async ({ canvasElement }) => {
        const heading = await within(canvasElement).findByRole('heading', { level: 3, name: /^Beratungsstelle/ });
        await expect(heading.textContent).toBe('Beratungsstelle Nordlicht');
    },
};
