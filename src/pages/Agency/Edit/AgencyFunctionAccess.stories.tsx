import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-extraneous-dependencies -- story fixture
import { http, HttpResponse } from 'msw';
// eslint-disable-next-line import/no-unresolved -- Storybook subpath export
import { expect, within } from 'storybook/test';
import { AgencyEditFrame, agencyEditHandlers, installAgencyStoryAuth } from './agencyEditStoryHarness.matrix';

/**
 * Beratungsstelle > Funktionszugriff (`/admin/agency/:id/functionalities`): the real page, HTTP mocked.
 */
const meta = {
    title: 'Settings/Beratungsstellen/Funktionszugriff/Ganze Seite',
    id: 'admin-agency-function-access',
    component: AgencyEditFrame,
    parameters: { layout: 'fullscreen', msw: { handlers: agencyEditHandlers } },
    render: () => <AgencyEditFrame section="functionalities" />,
} satisfies Meta<typeof AgencyEditFrame>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PlatformAdmin: Story = { beforeEach: () => installAgencyStoryAuth('platformAdmin') };
/**
 * The centre sees the Supervision section in the Mail-Beratung tile like every level (Frank, 2026-11-25). ORISO-Frontend#2491: the Team-Chat
 * tile is the centre's own policy value, like supervision — a switch, but no requirement lock (there is no
 * level below a Beratungsstelle).
 */
export const AgencyAdmin: Story = {
    beforeEach: () => installAgencyStoryAuth('agencyAdmin'),
    parameters: {
        msw: {
            handlers: [
                // The Live Chat tile lists the centre's chat links (read-only).
                http.get('*/service/useradmin/invitelinks', () =>
                    HttpResponse.json({ content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 }),
                ),
                ...agencyEditHandlers,
            ],
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const mail = await canvas.findByTestId('chat-type-card-oneOnOne', {}, { timeout: 8000 });
        await expect(within(mail).getByRole('group', { name: /^Supervision$/ })).toBeVisible();
        await expect(canvas.queryByTestId('supervision-tile')).not.toBeInTheDocument();
        const teamChat = canvas.getByTestId('team-chat-tile');
        const buttons = within(teamChat).getAllByRole('button', { name: /^(Aktiviert|Enabled): / });
        await expect(buttons).toHaveLength(1);
        await expect(buttons[0]).toBeEnabled();
    },
};
