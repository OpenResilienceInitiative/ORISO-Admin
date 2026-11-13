import type { Meta, StoryObj } from '@storybook/react-vite';
import { AgencyEditFrame, agencyEditHandlers, installAgencyStoryAuth } from './agencyEditStoryHarness.matrix';

/**
 * Beratungsstelle > Rechtliches (`/admin/agency/:id/legal-settings`): the real page, HTTP mocked.
 * Two layouts for the document tiles are on offer, see the variant stories.
 */
const meta = {
    title: 'Settings/Beratungsstellen/Rechtliches/Ganze Seite',
    id: 'admin-agency-legal',
    component: AgencyEditFrame,
    parameters: { layout: 'fullscreen', msw: { handlers: agencyEditHandlers } },
    render: (args) => <AgencyEditFrame section="legal" legalLayout={args.legalLayout} />,
} satisfies Meta<typeof AgencyEditFrame>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The platform admin on the default layout (variant A). */
export const PlatformAdmin: Story = { beforeEach: () => installAgencyStoryAuth('platformAdmin') };
export const AgencyAdmin: Story = { beforeEach: () => installAgencyStoryAuth('agencyAdmin') };

/** Variant A: the three document tiles take the whole raster row, like documents, not like cards. */
export const VariantAWideTiles: Story = {
    args: { legalLayout: 'raster' },
    beforeEach: () => installAgencyStoryAuth('platformAdmin'),
};

/** Variant B: every tile folds up to its header (icon, title, state); the first one is open. */
export const VariantBCollapsibleTiles: Story = {
    args: { legalLayout: 'collapsible' },
    beforeEach: () => installAgencyStoryAuth('platformAdmin'),
};
