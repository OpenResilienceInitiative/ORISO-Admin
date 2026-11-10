import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse } from 'msw';
// eslint-disable-next-line import/no-unresolved -- SB10 subpath export, invisible to the eslint import resolver
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { findPopup, popupsOf } from '../../../../../test/storyPopups';
import { AssignedConsultants } from './AssignedConsultants';

/**
 * Counsellors already assigned to a Beratungsstelle, shown in the "Sichtbarkeit in der
 * Registrierung" card next to the add picker (#1069). Removal needs the card in edit mode
 * and a confirmation; the list comes from GET /useradmin/agencies/{id}/consultants.
 */
const meta: Meta<typeof AssignedConsultants> = {
    title: 'Settings/Beratungsstellen/Stammdaten & Mehr/AssignedConsultants',
    id: 'organisms-agency-assignedconsultants',
    component: AssignedConsultants,
    decorators: [
        (Story) => (
            <div style={{ maxWidth: 520, padding: 24, background: 'var(--m3-surface-container-lowest, #fff)' }}>
                <Story />
            </div>
        ),
    ],
    args: { agencyId: '55', editing: true },
};

export default meta;

type Story = StoryObj<typeof AssignedConsultants>;

const consultant = (id: string, firstname: string, lastname: string) => ({
    _embedded: { id, firstname, lastname, email: `${firstname.toLowerCase()}@example.org` },
});

const withConsultants = (entries: ReturnType<typeof consultant>[]) => ({
    msw: {
        handlers: [
            http.get('*/service/useradmin/agencies/55/consultants', () =>
                HttpResponse.json({ total: entries.length, _embedded: entries, _links: {} }),
            ),
        ],
    },
});

/** Edit mode: every assigned person as an input chip with a remove action. */
export const Editing: Story = {
    parameters: withConsultants([consultant('c-1', 'Erika', 'Muster'), consultant('c-2', 'Max', 'Admin')]),
    play: async ({ canvas }) => {
        await expect(await canvas.findByText('Erika Muster')).toBeInTheDocument();
    },
};

/** View mode: the list stays visible, the remove action is disabled (disable, not hide). */
export const ReadOnly: Story = {
    args: { editing: false },
    parameters: withConsultants([consultant('c-1', 'Erika', 'Muster')]),
};

/** Nobody assigned yet. */
export const Empty: Story = {
    parameters: withConsultants([]),
};

let consultantRequests = 0;
let consultantsRecovered = false;
/**
 * N5: the list cannot be loaded - one error pop-up titled "Beratungsstelle" with "Erneut versuchen"; the tile
 * keeps quiet text. The retry asks again and the people appear.
 */
export const LoadErrorRetry: Story = {
    parameters: {
        msw: {
            handlers: [
                http.get('*/service/useradmin/agencies/55/consultants', () => {
                    consultantRequests += 1;
                    return consultantsRecovered
                        ? HttpResponse.json({ total: 1, _embedded: [consultant('c-1', 'Erika', 'Muster')], _links: {} })
                        : new HttpResponse(null, { status: 500 });
                }),
            ],
        },
    },
    beforeEach: () => {
        consultantRequests = 0;
        consultantsRecovered = false;
    },
    play: async ({ canvasElement }) => {
        const popup = await findPopup(canvasElement, 'Berater:innen konnten nicht geladen werden', 'error');
        await expect(popup).toHaveTextContent('Beratungsstelle');
        await expect(within(canvasElement).getByText('Dieser Bereich konnte nicht geladen werden.')).toBeVisible();
        const before = consultantRequests;
        consultantsRecovered = true;
        await userEvent.click(within(popup).getByRole('button', { name: 'Erneut versuchen' }));
        await waitFor(() => expect(consultantRequests).toBeGreaterThan(before));
        await expect(await within(canvasElement).findByText('Erika Muster')).toBeInTheDocument();
        await waitFor(() => expect(popupsOf(canvasElement)).toHaveLength(0));
    },
};
