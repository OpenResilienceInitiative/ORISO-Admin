import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse, delay } from 'msw';
import { Route, Routes } from 'react-router-dom';
// eslint-disable-next-line import/no-unresolved -- SB10 subpath export, invisible to the eslint import resolver
import { expect, within } from 'storybook/test';
import type { CounselorData } from '../../../types/counselor';
import { UserRole } from '../../../enums/UserRole';
import { setStoryAuth, withAdminProviders } from '../../../utils/storybook/adminStoryDecorators';
import { UsersList } from './index';

// GET .../service/users/consultants/search — HAL body: `{ total, _embedded: [...] }`.
const CONSULTANTS_ENDPOINT = '*/service/users/consultants/search';

const CONSULTANTS: CounselorData[] = [
    {
        id: 'c-1',
        key: 'c-1',
        firstname: 'Anna',
        lastname: 'Muster',
        email: 'anna.muster@example.org',
        username: 'amuster',
        active: true,
        absent: false,
        formalLanguage: true,
        gender: 'FEMALE',
        phone: '',
        agencies: [{ id: '101', name: 'Beratungsstelle Nord', postcode: '20095', city: 'Hamburg' }],
        agencyIds: ['101'],
        status: 'CREATED',
        tenantId: '1',
        tenantName: 'Demo-Mandant',
    },
    {
        id: 'c-2',
        key: 'c-2',
        firstname: 'Ben',
        lastname: 'Beispiel',
        email: 'ben.beispiel@example.org',
        username: 'bbeispiel',
        active: false,
        absent: true,
        absenceMessage: 'Im Urlaub',
        formalLanguage: false,
        gender: 'MALE',
        phone: '',
        agencies: [{ id: '102', name: 'Jugendberatung Mitte', postcode: '10115', city: 'Berlin' }],
        agencyIds: ['102'],
        status: 'CREATED',
        tenantId: '1',
        tenantName: 'Demo-Mandant',
    },
];

const consultantsResponse = (list: CounselorData[]) => HttpResponse.json({ total: list.length, _embedded: list });

const meta = {
    title: 'Organisms/Pages/Users/UserManagement',
    component: UsersList,
    parameters: { layout: 'fullscreen' },
    decorators: [
        (Story) => {
            // Super-admin token so the create button + editable columns render.
            setStoryAuth([UserRole.AgencyAdmin, UserRole.TenantAdmin, UserRole.UserAdmin], 0);
            return withAdminProviders(Story);
        },
    ],
} satisfies Meta<typeof UsersList>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The consultants section with a populated, sortable table. */
export const Filled: Story = {
    parameters: { msw: { handlers: [http.get(CONSULTANTS_ENDPOINT, () => consultantsResponse(CONSULTANTS))] } },
};

/**
 * Real Pre-Dev data shapes: long agency and city names plus a consultant assigned to several
 * agencies. Guards the agency chips against mid-word clipping and the trailing identity columns
 * against being pushed out of sight (ORISO-Admin#99).
 */
export const LongAgencyNames: Story = {
    parameters: {
        msw: {
            handlers: [
                http.get(CONSULTANTS_ENDPOINT, () =>
                    consultantsResponse([
                        {
                            ...CONSULTANTS[0],
                            id: 'c-long',
                            key: 'c-long',
                            firstname: 'Shanzae',
                            lastname: 'Imran',
                            email: 'shanzaeimran2@example.org',
                            username: 'shanzae-consultant',
                            agencies: [
                                {
                                    id: '201',
                                    name: 'Codex PreDev E2E 20260625222629',
                                    postcode: '10115',
                                    city: 'Berlin-Charlottenburg-Wilmersdorf',
                                },
                            ],
                            agencyIds: ['201'],
                        },
                        {
                            ...CONSULTANTS[1],
                            id: 'c-multi',
                            key: 'c-multi',
                            firstname: 'Nikunj',
                            lastname: 'Consultant',
                            agencies: [
                                { id: '202', name: 'Caritas Agency 2', postcode: '13055', city: 'Berlin' },
                                {
                                    id: '203',
                                    name: 'Beratungsstelle für Familien und Alleinerziehende',
                                    postcode: '12345',
                                    city: 'Frankfurt am Main',
                                },
                            ],
                            agencyIds: ['202', '203'],
                        },
                    ]),
                ),
            ],
        },
    },
};

/** No consultants yet — the table shows its empty state. */
export const Empty: Story = {
    parameters: { msw: { handlers: [http.get(CONSULTANTS_ENDPOINT, () => consultantsResponse([]))] } },
};

/** Request in flight — the table renders its loading spinner. */
export const Loading: Story = {
    parameters: {
        msw: {
            handlers: [
                http.get(CONSULTANTS_ENDPOINT, async () => {
                    await delay('infinite');
                    return consultantsResponse([]);
                }),
            ],
        },
    },
};

/** Backend failure (500): the search helper degrades gracefully to an empty table. */
export const Error: Story = {
    parameters: { msw: { handlers: [http.get(CONSULTANTS_ENDPOINT, () => new HttpResponse(null, { status: 500 }))] } },
};

// GET .../service/useradmin/tenantadmins/search — same HAL body; each admin carries its Träger.
const TENANT_ADMINS_ENDPOINT = '*/service/useradmin/tenantadmins/search';

const TENANT_ADMINS: CounselorData[] = [
    { ...CONSULTANTS[0], id: 'ta-1', tenantId: '3', tenantName: 'Caritas Hamburg', agencies: [] },
    { ...CONSULTANTS[1], id: 'ta-2', tenantId: '7', tenantName: 'Diakonie Berlin', agencies: [] },
];

const onTenantAdminsTab = () => (
    <Routes location="/admin/users/tenant-admins">
        <Route path="/admin/users/:typeOfUsers" element={<UsersList />} />
    </Routes>
);

/** Träger-Admins tab seen by a platform admin: every row names its Träger. */
export const TenantAdminsForPlatformAdmin: Story = {
    render: onTenantAdminsTab,
    parameters: {
        msw: { handlers: [http.get(TENANT_ADMINS_ENDPOINT, () => consultantsResponse(TENANT_ADMINS))] },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const header = await canvas.findByRole('columnheader', { name: 'Träger' });
        await expect(header).toBeVisible();
        // Not clipped by the table's horizontal scroll at laptop width (ORISO-Admin#99).
        const scroller = header.closest('.ant-table-content, .ant-table-body') ?? canvasElement;
        await expect(header.getBoundingClientRect().right).toBeLessThanOrEqual(scroller.getBoundingClientRect().right);
        await expect(await canvas.findByText('Caritas Hamburg')).toBeVisible();
        await expect(canvas.getByText('Diakonie Berlin')).toBeVisible();
    },
};

/** The same tab for a Träger admin: only their own Träger, so no Träger column. */
export const TenantAdminsForTraegerAdmin: Story = {
    render: onTenantAdminsTab,
    decorators: [
        (Story) => {
            setStoryAuth([UserRole.TenantAdmin, UserRole.UserAdmin], 3);
            return <Story />;
        },
    ],
    parameters: {
        msw: { handlers: [http.get(TENANT_ADMINS_ENDPOINT, () => consultantsResponse(TENANT_ADMINS.slice(0, 1)))] },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(await canvas.findByText('Muster')).toBeVisible();
        await expect(canvas.queryByRole('columnheader', { name: 'Träger' })).toBeNull();
    },
};
