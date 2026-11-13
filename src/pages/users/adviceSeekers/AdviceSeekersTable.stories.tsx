import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse, delay } from 'msw';
// eslint-disable-next-line import/no-unresolved -- SB10 subpath export, invisible to the eslint import resolver
import { expect, userEvent, within } from 'storybook/test';
import type { AdviceSeekerData } from '../../../api/adviceSeeker/adviceSeekers';
import { UserRole } from '../../../enums/UserRole';
import { setStoryAuth, withSeededAdminProviders } from '../../../utils/storybook/adminStoryDecorators';
import { AdviceSeekersTable } from './AdviceSeekersTable';

const ASKERS_ENDPOINT = '*/service/useradmin/askers';
const AGENCIES_ENDPOINT = '*/service/agencyadmin/agencies';
const TENANTS_ENDPOINT = '*/service/tenantadmin/search';

const AGENCIES = [
    { id: 101, name: 'Beratungsstelle Nord', postcode: '20095', city: 'Hamburg', tenantId: 3 },
    { id: 102, name: 'Jugendberatung Mitte', postcode: '10115', city: 'Berlin', tenantId: 3 },
];

const SEEKERS: AdviceSeekerData[] = [
    {
        id: 'a-1',
        username: 'ratsuchend_42',
        tenantId: 3,
        agencyIds: [101],
        deletionState: 'ACTIVE',
        createDate: '2026-10-02T09:12:00',
    },
    {
        id: 'a-2',
        username: 'anonym_7',
        tenantId: 3,
        agencyIds: [101, 102],
        deletionState: 'ACTIVE',
        createDate: '2026-10-20T16:40:00',
    },
    {
        id: 'a-3',
        username: 'schulden_hilfe',
        tenantId: 3,
        agencyIds: [102],
        deletionState: 'READ_ONLY_SAFEGUARD',
        createDate: '2026-09-11T08:00:00',
        deleteDate: '2026-11-12T21:30:00',
    },
    {
        id: 'a-5',
        username: 'schuldenfrei_2026',
        tenantId: 3,
        agencyIds: [101],
        deletionState: 'HARD_DELETE_PARTIAL_FAILURE',
        createDate: '2026-07-14T11:20:00',
        deleteDate: '2026-11-10T21:30:00',
        deletionFailureReason: 'DATABASE: Unable to delete user: still referenced by session (session_ibfk_1)',
        deletionFailedAt: '2026-11-13T03:00:12',
    },
    {
        id: 'group-chat-system-3',
        username: 'group-chat-system-3',
        tenantId: 3,
        agencyIds: [],
        deletionState: 'ACTIVE',
        createDate: '2026-05-02T08:00:00',
        technical: true,
        deletable: false,
    },
    {
        id: 'group-chat-system-17',
        username: 'group-chat-system-17',
        tenantId: 17,
        agencyIds: [],
        deletionState: 'ACTIVE',
        createDate: '2026-08-01T10:00:00',
        technical: true,
        // Its Träger 17 was deleted without it (Staging, Oct 2026): it may go now.
        deletable: true,
    },
];

const handlers = (list: AdviceSeekerData[]) => [
    http.get(ASKERS_ENDPOINT, () => HttpResponse.json({ total: list.length, _embedded: list })),
    http.delete(`${ASKERS_ENDPOINT}/:id`, async () => {
        await delay(300);
        return new HttpResponse(null, { status: 200 });
    }),
    http.get(AGENCIES_ENDPOINT, () => HttpResponse.json({ total: AGENCIES.length, _embedded: AGENCIES })),
    http.get(TENANTS_ENDPOINT, () => HttpResponse.json({ total: 0, _embedded: [] })),
];

const meta = {
    title: 'Organisms/Pages/Users/AdviceSeekers',
    component: AdviceSeekersTable,
    parameters: { layout: 'padded', msw: { handlers: handlers(SEEKERS) } },
    decorators: [
        (Story) => {
            // A Träger admin with user-admin: may list and delete within their Träger.
            setStoryAuth([UserRole.TenantAdmin, UserRole.UserAdmin], 3);
            return withSeededAdminProviders(Story);
        },
    ],
} satisfies Meta<typeof AdviceSeekersTable>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Active, in-deletion and failed advice seekers, and technical group-chat accounts. */
export const Overview: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(await canvas.findByText('ratsuchend_42')).toBeInTheDocument();
        await expect(canvas.getAllByText('Beratungsstelle Nord, Jugendberatung Mitte')).toHaveLength(1);
    },
};

/** Two selected advice seekers: the dialog says what happens now and what happens tonight. */
export const ConfirmBulkDeletion: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await canvas.findByText('ratsuchend_42');
        const checkboxes = canvas.getAllByRole('checkbox');
        // [0] is "select all"; the in-deletion rows are disabled.
        await userEvent.click(checkboxes[1]);
        await userEvent.click(checkboxes[2]);
        const deleteSelected = canvas.getAllByRole('button').find((button) => button.textContent?.includes('2'));
        await userEvent.click(deleteSelected as HTMLElement);
        const dialog = await within(document.body).findByRole('dialog');
        await expect(within(dialog).getByText('anonym_7')).toBeInTheDocument();
    },
};

/** Nobody matches the search or filter. */
export const Empty: Story = {
    parameters: { msw: { handlers: handlers([]) } },
};
