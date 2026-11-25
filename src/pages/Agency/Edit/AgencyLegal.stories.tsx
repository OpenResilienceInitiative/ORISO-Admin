import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
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

/** Real agency route: shared legal-document tiles with their role-specific content. */
export const PlatformAdmin: Story = {
    beforeEach: () => installAgencyStoryAuth('platformAdmin'),
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const imprint = await canvas.findByRole('button', { name: /Impressum der Beratungsstelle/ });
        const privacy = await canvas.findByRole('button', { name: /Datenschutzerklärung der Beratungsstelle/ });
        const dpa = await canvas.findByRole('button', { name: /Vertragsunterlagen/ });
        await waitFor(() => expect(canvasElement.querySelectorAll('[data-collapsible-tile]')).toHaveLength(5));
        await expect(imprint).toHaveAttribute('aria-expanded', 'false');
        await expect(privacy).toHaveAttribute('aria-expanded', 'false');
        await userEvent.click(dpa);
        await expect(dpa).toHaveAttribute('aria-expanded', 'true');
        await userEvent.click(imprint);
        await expect(imprint).toHaveAttribute('aria-expanded', 'true');
        // The editor is inside the shared tile: no second nested tile or repeated title.
        const imprintTile = imprint.closest('[data-collapsible-tile]')!;
        await expect(imprintTile.querySelectorAll('[data-collapsible-tile]')).toHaveLength(0);
        // The document tile unfolds with an animation; wait until it is open.
        await waitFor(() =>
            expect(within(imprintTile as HTMLElement).getByText(/Impressum der Beratungsstelle\./)).toBeVisible(),
        );
    },
};
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
