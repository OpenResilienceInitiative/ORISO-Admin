import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse } from 'msw';
import { Navigate, Route, Routes } from 'react-router-dom';
// eslint-disable-next-line import/no-unresolved -- exports-map subpath the eslint node resolver can't see (resolves for tsc/Vite)
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { UserRole } from '../../../enums/UserRole';
import { popupsOf } from '../../../test/storyPopups';
import { setStoryAuth, withAdminProviders } from '../../../utils/storybook/adminStoryDecorators';
import { AgencyPageEdit } from './index';

/**
 * Creating a Beratungsstelle as a Träger admin (tenantId 21). Every authenticated call is mocked: an
 * unmocked one 401s and force-logs-out the story.
 */
const DPA_GATE = '*/service/tenantadmin/21/dpa/gate';

const baseHandlers = [
    http.get('*/service/topic*', () => HttpResponse.json([])),
    http.get('*/service/users/consultants/search*', () => HttpResponse.json({ total: 0, embedded: [] })),
    http.get('*/service/agencyadmin/agencies*', () => HttpResponse.json({ embedded: [], total: 0 })),
    http.get('*/service/tenant/*', () => HttpResponse.json({ id: 21, settings: {} })),
    http.get('*/service/tenantadmin/21', () => HttpResponse.json({ id: 21, name: 'Träger Nord', settings: {} })),
];

const meta = {
    title: 'Pages/Agency/AgencyEditPage',
    component: AgencyPageEdit,
    parameters: { layout: 'fullscreen' },
    decorators: [
        (Story) => {
            // Creating a centre needs `Agency.create`, which the agency-admin role carries (guard on /admin/agency/add).
            setStoryAuth([UserRole.TenantAdmin, UserRole.AgencyAdmin], 21);
            // The preview already provides a MemoryRouter at "/"; the page reads `:id` from the route.
            return withAdminProviders(() => (
                <Routes>
                    <Route path="/" element={<Navigate to="/admin/agency/add" replace />} />
                    <Route path="/admin/agency/:id" element={<Story />} />
                </Routes>
            ));
        },
    ],
} satisfies Meta<typeof AgencyPageEdit>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * AG2: the Träger has not signed the data processing agreement, so no centre can be created yet. This is a
 * permanent state, not an event: plain text with its title and two text actions inside the page, no box and
 * no pop-up.
 */
export const CreationBlockedByMissingDpa: Story = {
    parameters: {
        msw: {
            handlers: [
                http.get(DPA_GATE, () => HttpResponse.json({ dpaPublished: true, dpaSigned: false })),
                ...baseHandlers,
            ],
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(await canvas.findByText('Bestätigung der Vertragsunterlagen erforderlich')).toBeVisible();
        await expect(canvas.getByRole('button', { name: 'Erneut versuchen' })).toBeVisible();
        await expect(popupsOf(canvasElement)).toHaveLength(0);
    },
};

let gateRequests = 0;
let gateRecovered = false;
/** The gate cannot be read: the same blocked state; "Erneut versuchen" asks again and the form appears. */
export const GateUnavailableRetry: Story = {
    parameters: {
        msw: {
            handlers: [
                http.get(DPA_GATE, () => {
                    gateRequests += 1;
                    return gateRecovered
                        ? HttpResponse.json({ dpaPublished: true, dpaSigned: true, newCounsellingAllowed: true })
                        : new HttpResponse(null, { status: 500 });
                }),
                ...baseHandlers,
            ],
        },
    },
    beforeEach: () => {
        gateRequests = 0;
        gateRecovered = false;
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const retry = await canvas.findByRole('button', { name: 'Erneut versuchen' });
        const before = gateRequests;
        gateRecovered = true;
        await userEvent.click(retry);
        await waitFor(() => expect(gateRequests).toBeGreaterThan(before));
        await waitFor(() => expect(canvas.queryByRole('button', { name: 'Erneut versuchen' })).toBeNull());
    },
};
