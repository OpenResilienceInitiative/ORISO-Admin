import type { Decorator, Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse, delay } from 'msw';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
// eslint-disable-next-line import/no-unresolved -- SB10 subpath export, invisible to the eslint import resolver
import { expect, userEvent, waitFor, within } from 'storybook/test';
import type { CounselorData } from '../../../types/counselor';
import { UserRole } from '../../../enums/UserRole';
import { encodeUsername } from '../../../utils/encryptionHelpers';
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
        updateDate: '2026-09-22T08:15:00',
        otherIdentityTypes: ['TENANT_ADMIN'],
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
        updateDate: '2026-06-03T14:40:00',
    },
];

const consultantsResponse = (list: CounselorData[]) => HttpResponse.json({ total: list.length, _embedded: list });

const meta = {
    title: 'Organisms/Pages/Users/UserManagement',
    component: UsersList,
    parameters: { layout: 'fullscreen' },
    // A4 layout from 1280 up; the narrower stories below pick their own width.
    globals: { viewport: { value: 'desktop', isRotated: false } },
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
    {
        ...CONSULTANTS[0],
        id: 'ta-1',
        tenantId: '3',
        tenantName: 'Caritas Hamburg',
        agencies: [],
        hasOtherIdentity: true,
    },
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
        await expect(canvasElement.querySelectorAll('[data-scope-chip="tenant"]')).toHaveLength(2);
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
        await expect(await canvas.findByText(/Muster/)).toBeVisible();
        await expect(canvas.queryByRole('columnheader', { name: 'Träger' })).toBeNull();
    },
};

/**
 * A server that cannot sort by "Zuletzt aktualisiert" answers 400; the rows then come sorted by
 * first name. The arrow moves to "Vorname" and a notice says so, instead of a silent mismatch.
 */
export const SortRejectedByServer: Story = {
    parameters: {
        msw: {
            handlers: [
                http.get(CONSULTANTS_ENDPOINT, ({ request }) =>
                    new URL(request.url).searchParams.get('field') === 'FIRSTNAME'
                        ? consultantsResponse(CONSULTANTS)
                        : new HttpResponse(null, { status: 400 }),
                ),
            ],
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(await canvas.findByRole('status')).toHaveTextContent('Vorname');
        await expect(canvas.getByRole('columnheader', { name: /Vorname/ })).toHaveAttribute('aria-sort', 'ascending');
        await expect(canvas.getByRole('columnheader', { name: /Zuletzt aktualisiert/ })).not.toHaveAttribute(
            'aria-sort',
            'descending',
        );
    },
};

// ---- One story per users-hub tab: the same people, and edit/delete lead where they always did.

const AGENCY_ADMINS_ENDPOINT = '*/service/useradmin/agencyadmins/search';

const PLATFORM_ADMINS: CounselorData[] = [
    { ...CONSULTANTS[0], id: 'pa-1', tenantId: '0', tenantName: '', agencies: [] },
    { ...CONSULTANTS[1], id: 'pa-2', tenantId: '0', tenantName: '', agencies: [] },
];

const EditTarget = () => <p data-testid="edit-target">{useLocation().pathname}</p>;

const onTab = (tab: string) => () =>
    (
        <Routes>
            <Route path="/" element={<Navigate to={`/admin/users/${tab}`} replace />} />
            <Route path="/admin/users/:typeOfUsers" element={<UsersList />} />
            <Route path="*" element={<EditTarget />} />
        </Routes>
    );

const rowOf = async (canvasElement: HTMLElement, lastname: string) => {
    const cell = await within(canvasElement).findByText(new RegExp(lastname));
    return cell.closest('tr') as HTMLElement;
};

// The last two buttons of a row are edit and delete, in the old and the new table alike.
const rowButtons = (row: HTMLElement) => within(row).getAllByRole('button').slice(-2);

const expectPeople = async (canvasElement: HTMLElement) => {
    await rowOf(canvasElement, 'Muster');
    await expect(within(canvasElement).getByText(/Beispiel/)).toBeVisible();
};

// Username and the "Auch …" mark live in the person cell; there is no separate column for them.
const expectPersonCell = async (canvasElement: HTMLElement, alsoLabel?: string) => {
    const row = await rowOf(canvasElement, 'Muster');
    await expect(within(row).getByText('@amuster')).toBeVisible();
    await expect(within(row).getByRole('button', { name: 'E-Mail von Anna Muster kopieren' })).toBeVisible();
    await expect(within(canvasElement).queryByRole('columnheader', { name: /^Auch / })).toBeNull();
    if (alsoLabel) {
        await expect(within(row).getByText(alsoLabel).parentElement).toBe(
            within(row).getByText('Anna Muster').parentElement,
        );
    } else {
        await expect(within(row).queryByText(/^Auch /)).toBeNull();
    }
};

const expectEditGoesTo = async (canvasElement: HTMLElement, path: string) => {
    const [edit] = rowButtons(await rowOf(canvasElement, 'Muster'));
    await userEvent.click(edit);
    await expect(await within(canvasElement).findByTestId('edit-target')).toHaveTextContent(path);
};

const expectDeleteDialog = async (canvasElement: HTMLElement, title: RegExp) => {
    const [, remove] = rowButtons(await rowOf(canvasElement, 'Muster'));
    await userEvent.click(remove);
    await expect(await within(canvasElement.ownerDocument.body).findByRole('dialog')).toHaveTextContent(title);
};

export const ConsultantsTab: Story = {
    render: onTab('consultants'),
    parameters: { msw: { handlers: [http.get(CONSULTANTS_ENDPOINT, () => consultantsResponse(CONSULTANTS))] } },
    play: async ({ canvasElement, step }) => {
        await expectPeople(canvasElement);
        const canvas = within(canvasElement);
        await step('status as words, centre as chip with PLZ and Ort', async () => {
            await expect(canvas.getByText('Aktiv')).toBeVisible();
            await expect(canvas.getByText('Abwesend')).toBeVisible();
            await expect(canvas.getByText('20095 Hamburg')).toBeVisible();
        });
        await step('arrows only where the server sorts; newest first by default', async () => {
            await expect(canvas.getByRole('columnheader', { name: /Zuletzt aktualisiert/ })).toHaveAttribute(
                'aria-sort',
                'descending',
            );
            await expect(canvas.getByRole('columnheader', { name: /^Name/ })).toHaveAttribute('aria-sort', 'none');
            await expect(canvas.getByRole('columnheader', { name: 'Beratungsstellen' })).not.toHaveAttribute(
                'aria-sort',
            );
            await expect(canvas.getByRole('columnheader', { name: 'Status' })).not.toHaveAttribute('aria-sort');
        });
        await step('person cell: @username, copy, "Auch Träger-Admin" next to the name', () =>
            expectPersonCell(canvasElement, 'Auch Träger-Admin'),
        );
        await step('"Einladen" leads to the Links section', async () => {
            await expect(canvas.getByRole('link', { name: /Einladen/ })).toHaveAttribute('href', '/admin/links');
        });
        await step('delete asks with the counsellor dialog', () =>
            expectDeleteDialog(canvasElement, /Berater wirklich löschen/),
        );
    },
};

export const ConsultantsTabEdit: Story = {
    ...ConsultantsTab,
    play: ({ canvasElement }) => expectEditGoesTo(canvasElement, '/admin/users/consultants/c-1'),
};

const AGENCY_ADMINS = CONSULTANTS.map((admin, index) => ({ ...admin, id: `aa-${index + 1}` }));

export const AgencyAdminsTab: Story = {
    render: onTab('agency-admins'),
    parameters: { msw: { handlers: [http.get(AGENCY_ADMINS_ENDPOINT, () => consultantsResponse(AGENCY_ADMINS))] } },
    play: async ({ canvasElement, step }) => {
        await expectPeople(canvasElement);
        await step('delete asks with the counsellor dialog', () =>
            expectDeleteDialog(canvasElement, /Berater wirklich löschen/),
        );
    },
};

export const AgencyAdminsTabEdit: Story = {
    ...AgencyAdminsTab,
    play: ({ canvasElement }) => expectEditGoesTo(canvasElement, '/admin/users/agency-admins/aa-1'),
};

export const TenantAdminsTab: Story = {
    render: onTab('tenant-admins'),
    parameters: { msw: { handlers: [http.get(TENANT_ADMINS_ENDPOINT, () => consultantsResponse(TENANT_ADMINS))] } },
    play: async ({ canvasElement, step }) => {
        await expectPeople(canvasElement);
        await step('person cell with "Auch Berater*in"', () => expectPersonCell(canvasElement, 'Auch Berater*in'));
        await step('delete asks with the admin dialog', () =>
            expectDeleteDialog(canvasElement, /Möchten Sie Anna Muster wirklich löschen/),
        );
    },
};

export const TenantAdminsTabEdit: Story = {
    ...TenantAdminsTab,
    play: ({ canvasElement }) => expectEditGoesTo(canvasElement, '/admin/users/tenant-admins/ta-1'),
};

export const PlatformAdminsTab: Story = {
    render: onTab('platform-admins'),
    parameters: {
        msw: { handlers: [http.get(TENANT_ADMINS_ENDPOINT, () => consultantsResponse(PLATFORM_ADMINS))] },
    },
    play: async ({ canvasElement, step }) => {
        await expectPeople(canvasElement);
        await step('same person cell and status chips as the other tabs', async () => {
            await expectPersonCell(canvasElement);
            const row = await rowOf(canvasElement, 'Muster');
            await expect(row.querySelector('[data-status] svg')).not.toBeNull();
        });
        await step('delete asks with the admin dialog', () =>
            expectDeleteDialog(canvasElement, /Möchten Sie Anna Muster wirklich löschen/),
        );
    },
};

export const PlatformAdminsTabEdit: Story = {
    ...PlatformAdminsTab,
    play: ({ canvasElement }) => expectEditGoesTo(canvasElement, '/admin/users/platform-admins/pa-1'),
};

/** Several centres: the first shows in the row, the rest and the topics per centre on expand. */
export const ConsultantWithSeveralCentres: Story = {
    render: onTab('consultants'),
    parameters: {
        msw: {
            handlers: [
                http.get(CONSULTANTS_ENDPOINT, () =>
                    consultantsResponse([
                        {
                            ...CONSULTANTS[0],
                            topics: [
                                { id: 1, name: 'Schulden' },
                                { id: 2, name: 'Sucht' },
                            ] as CounselorData['topics'],
                            agencies: [
                                {
                                    id: '101',
                                    name: 'Beratungsstelle Nord',
                                    postcode: '20095',
                                    city: 'Hamburg',
                                    topics: [{ id: 1, name: 'Schulden' }],
                                },
                                {
                                    id: '102',
                                    name: 'Suchtberatung Süd',
                                    postcode: '80331',
                                    city: 'München',
                                    topics: [
                                        { id: 2, name: 'Sucht' },
                                        { id: 3, name: 'Familie' },
                                    ],
                                },
                            ] as CounselorData['agencies'],
                        },
                    ]),
                ),
            ],
        },
    },
    play: async ({ canvasElement, userEvent: user }) => {
        const canvas = within(canvasElement);
        await expect(await canvas.findByText('20095 Hamburg')).toBeVisible();
        await expect(canvas.queryByText('80331 München')).toBeNull();

        const toggle = canvas.getByRole('button', { name: 'Beratungsstellen von Anna Muster anzeigen' });
        await expect(toggle).toHaveAttribute('aria-expanded', 'false');
        await user.click(toggle);
        const details = await canvas.findByRole('list', { name: /Beratungsstellen von Anna Muster/ });
        await expect(toggle).toHaveAttribute('aria-controls', details.id);
        await expect(toggle).toHaveAccessibleName('Beratungsstellen von Anna Muster ausblenden');
        const centres = within(details).getAllByRole('listitem');
        await expect(centres).toHaveLength(2);
        await expect(centres[0]).toHaveTextContent(/Beratungsstelle Nord.*Schulden/);
        await expect(centres[1]).toHaveTextContent(/Suchtberatung Süd.*Sucht/);
        await expect(centres[1]).not.toHaveTextContent('Familie');
    },
};

/** The Träger tab keeps its own AntD table (name, subdomain, ID, counsellors, actions). */
export const TenantsTab: Story = {
    render: onTab('tenants'),
    parameters: {
        msw: {
            handlers: [
                http.get('*/service/tenantadmin/search', () =>
                    HttpResponse.json({
                        total: 1,
                        _embedded: [{ id: 7, name: 'Caritas Nord', subdomain: 'nord', beraterCount: 12 }],
                    }),
                ),
            ],
        },
    },
    play: async ({ canvasElement }) => {
        const row = await rowOf(canvasElement, 'Caritas Nord');
        await expect(within(row).getByText('12')).toBeVisible();
        await expect(within(row).getByRole('link', { name: /nord/ })).toBeVisible();
        await expect(within(row).queryByText(/^@/)).toBeNull();
    },
};

/** Legacy rows still carry the RC-era Base32 username (`enc.…`); the cell shows it decoded. */
export const LegacyEncodedUsername: Story = {
    render: onTab('consultants'),
    parameters: {
        msw: {
            handlers: [
                http.get(CONSULTANTS_ENDPOINT, () =>
                    consultantsResponse([{ ...CONSULTANTS[0], username: encodeUsername('lmeier') }]),
                ),
            ],
        },
    },
    play: async ({ canvasElement }) => {
        const row = await rowOf(canvasElement, 'Muster');
        await expect(within(row).getByText('@lmeier')).toBeVisible();
        await expect(within(row).queryByText(/enc\./)).toBeNull();
    },
};

/** The name column sorts by Nachname, Vorname or E-Mail; the pill says which. */
export const SortNameByEmail: Story = {
    render: onTab('consultants'),
    parameters: {
        msw: {
            handlers: [
                http.get(CONSULTANTS_ENDPOINT, ({ request }) => {
                    const field = new URL(request.url).searchParams.get('field');
                    return consultantsResponse(field === 'EMAIL' ? [...CONSULTANTS].reverse() : CONSULTANTS);
                }),
            ],
        },
    },
    play: async ({ canvasElement, userEvent: user }) => {
        const canvas = within(canvasElement);
        const body = within(canvasElement.ownerDocument.body);
        await rowOf(canvasElement, 'Muster');
        await user.click(canvas.getByRole('button', { name: /Name nach/ }));
        await user.click(await body.findByRole('menuitemradio', { name: 'E-Mail' }));

        const nameHeader = canvas.getByRole('columnheader', { name: /^Name/ });
        await expect(nameHeader).toHaveAttribute('aria-sort', 'ascending');
        await expect(within(nameHeader).getByRole('button', { name: /Name nach E-Mail/ })).toBeVisible();
        await waitFor(() => expect(canvas.getAllByRole('row')[1]).toHaveTextContent('Ben Beispiel'));
    },
};

// ---- Narrower screens: 1024–1279 fold Träger and Stellen into one column, 834 folds actions into ⋯, 390 shows cards.

const WIDTHS = {
    viewport: {
        options: {
            laptop1024: { name: 'Laptop 1024', styles: { width: '1024px', height: '800px' } },
            tablet834: { name: 'iPad portrait 834', styles: { width: '834px', height: '1112px' } },
        },
    },
};

// The app's sidebar rail takes 128px from 768px up; the story has no shell, so it leaves the room.
const withSidebarRail: Decorator = (Story) => (
    <div style={{ paddingLeft: 128 }}>
        <Story />
    </div>
);

// Neither the page nor the table itself may scroll sideways.
const noSideScroll = async (canvasElement: HTMLElement) => {
    const root = canvasElement.ownerDocument.documentElement;
    await expect(root.scrollWidth).toBeLessThanOrEqual(root.clientWidth);
    const scroller = canvasElement.querySelector('table')?.parentElement;
    if (scroller) await expect(scroller.scrollWidth).toBeLessThanOrEqual(scroller.clientWidth);
};

export const ConsultantsTabAt1024: Story = {
    render: onTab('consultants'),
    parameters: {
        ...WIDTHS,
        msw: { handlers: [http.get(CONSULTANTS_ENDPOINT, () => consultantsResponse(CONSULTANTS))] },
    },
    globals: { viewport: { value: 'laptop1024', isRotated: false } },
    decorators: [withSidebarRail],
    play: async ({ canvasElement }) => {
        const row = await rowOf(canvasElement, 'Muster');
        await expect(within(canvasElement).getByRole('columnheader', { name: /Zuletzt aktualisiert/ })).toBeVisible();
        await expect(within(row).getByRole('button', { name: 'Anna Muster bearbeiten' })).toBeVisible();
        await noSideScroll(canvasElement);
    },
};

/** From 1280 up the full layout: Träger and Stellen in their own columns, actions as buttons. */
export const ConsultantsTabAt1280: Story = {
    ...ConsultantsTabAt1024,
    globals: { viewport: { value: 'laptop', isRotated: false } },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const row = await rowOf(canvasElement, 'Muster');
        await expect(canvas.getByRole('columnheader', { name: 'Träger' })).toBeVisible();
        await expect(canvas.getByRole('columnheader', { name: 'Beratungsstellen' })).toBeVisible();
        await expect(canvas.getByRole('columnheader', { name: /Zuletzt aktualisiert/ })).toBeVisible();
        await expect(within(row).getByText('@amuster')).toBeVisible();
        await expect(within(row).getByRole('button', { name: 'Anna Muster löschen' })).toBeVisible();
        await noSideScroll(canvasElement);
    },
};

export const ConsultantsTabAt834: Story = {
    render: onTab('consultants'),
    parameters: {
        ...WIDTHS,
        msw: { handlers: [http.get(CONSULTANTS_ENDPOINT, () => consultantsResponse(CONSULTANTS))] },
    },
    globals: { viewport: { value: 'tablet834', isRotated: false } },
    decorators: [withSidebarRail],
    play: async ({ canvasElement, step, userEvent: user }) => {
        const canvas = within(canvasElement);
        const body = within(canvasElement.ownerDocument.body);
        const row = await rowOf(canvasElement, 'Muster');

        await step('three columns plus the ⋯ menu', async () => {
            const headers = canvas.getAllByRole('columnheader').map((header) => header.textContent ?? '');
            await expect(headers.filter(Boolean)).toHaveLength(3);
            await expect(canvas.queryByRole('columnheader', { name: /Zuletzt aktualisiert/ })).toBeNull();
            await expect(within(row).getByText('20095 Hamburg')).toBeVisible();
            await expect(within(row).getByText('Aktiv')).toBeVisible();
            await noSideScroll(canvasElement);
        });

        await step('tab arrows scroll the account types; Beratende starts in view', async () => {
            const left = canvas.getByRole('button', { name: 'Tabs nach links' });
            const right = canvas.getByRole('button', { name: 'Tabs nach rechts' });
            await waitFor(() => expect(right).toBeDisabled());
            await user.click(left);
            await waitFor(() => expect(right).toBeEnabled());
        });

        await step('⋯ opens the row menu; Bearbeiten goes where it always did', async () => {
            await user.click(within(row).getByRole('button', { name: 'Weitere Aktionen für Anna Muster' }));
            const menu = await body.findByRole('menu');
            // The menu fades in.
            await waitFor(() => expect(within(menu).getByRole('menuitem', { name: 'Löschen' })).toBeVisible());
            await user.click(within(menu).getByRole('menuitem', { name: 'Bearbeiten' }));
            await expect(await canvas.findByTestId('edit-target')).toHaveTextContent('/admin/users/consultants/c-1');
        });
    },
};

/** Träger-Admins at 1280: Träger and subdomain in their own columns, still no sideways scroll. */
export const TenantAdminsTabAt1280: Story = {
    render: onTab('tenant-admins'),
    parameters: {
        ...WIDTHS,
        msw: {
            handlers: [
                http.get(TENANT_ADMINS_ENDPOINT, () =>
                    consultantsResponse(
                        TENANT_ADMINS.map((admin) => ({ ...admin, tenantSubdomain: 'caritas-hamburg-nord' })),
                    ),
                ),
            ],
        },
    },
    globals: { viewport: { value: 'laptop', isRotated: false } },
    decorators: [withSidebarRail],
    play: async ({ canvasElement }) => {
        const row = await rowOf(canvasElement, 'Muster');
        await expect(within(row).getByText('Auch Berater*in')).toBeVisible();
        await expect(within(row).getByRole('button', { name: 'Anna Muster löschen' })).toBeVisible();
        await noSideScroll(canvasElement);
    },
};

/** Plattform-Admins get the same person cell, chips and width bands as every other tab. */
export const PlatformAdminsTabAt1280: Story = {
    render: onTab('platform-admins'),
    parameters: {
        ...WIDTHS,
        msw: { handlers: [http.get(TENANT_ADMINS_ENDPOINT, () => consultantsResponse(PLATFORM_ADMINS))] },
    },
    globals: { viewport: { value: 'laptop', isRotated: false } },
    decorators: [withSidebarRail],
    play: async ({ canvasElement }) => {
        const row = await rowOf(canvasElement, 'Muster');
        await expect(within(row).getByText('@amuster')).toBeVisible();
        await expect(row.querySelector('[data-status] svg')).not.toBeNull();
        await expect(within(row).getByRole('button', { name: 'Anna Muster löschen' })).toBeVisible();
        await noSideScroll(canvasElement);
    },
};

export const PlatformAdminsTabAt834: Story = {
    ...PlatformAdminsTabAt1280,
    globals: { viewport: { value: 'tablet834', isRotated: false } },
    play: async ({ canvasElement }) => {
        const row = await rowOf(canvasElement, 'Muster');
        await expect(within(row).getByText('@amuster')).toBeVisible();
        await expect(within(row).getByRole('button', { name: 'Weitere Aktionen für Anna Muster' })).toBeVisible();
        await noSideScroll(canvasElement);
    },
};

const CLARA: CounselorData = {
    ...CONSULTANTS[0],
    id: 'c-3',
    key: 'c-3',
    firstname: 'Clara',
    lastname: 'Dritte',
    email: 'clara.dritte@example.org',
    updateDate: '2026-05-01T09:00:00',
};

// Page 2 repeats Ben, as a server does when a row moves between two requests.
const pagedConsultants = http.get(CONSULTANTS_ENDPOINT, ({ request }) =>
    HttpResponse.json(
        new URL(request.url).searchParams.get('page') === '2'
            ? { total: 3, _embedded: [CONSULTANTS[1], CLARA] }
            : { total: 3, _embedded: CONSULTANTS },
    ),
);

export const ConsultantsTabAt390: Story = {
    render: onTab('consultants'),
    parameters: { msw: { handlers: [pagedConsultants] } },
    globals: { viewport: { value: 'phone', isRotated: false } },
    play: async ({ canvasElement, step, userEvent: user }) => {
        const canvas = within(canvasElement);

        await step('one card per person, no table', async () => {
            await waitFor(() => expect(canvas.getAllByRole('article')).toHaveLength(2));
            await expect(canvas.queryByRole('table')).toBeNull();
            await expect(canvas.getByText('2 von 3')).toBeVisible();
            await noSideScroll(canvasElement);
        });

        await step('expand shows the details', async () => {
            await user.click(canvas.getByRole('button', { name: 'Details zu Anna Muster' }));
            const card = canvas.getByRole('article', { name: 'Anna Muster' });
            await expect(within(card).getByText('anna.muster@example.org')).toBeVisible();
            await expect(within(card).getByText('@amuster')).toBeVisible();
            await expect(within(card).getByText('Beratungsstelle Nord')).toBeVisible();
            await expect(within(card).getByText('Zuletzt aktualisiert')).toBeVisible();
        });

        await step('"Weitere laden" appends page 2 without repeating Ben', async () => {
            await user.click(canvas.getByRole('button', { name: 'Weitere laden' }));
            await waitFor(() => expect(canvas.getAllByRole('article')).toHaveLength(3));
            await expect(canvas.getAllByRole('article', { name: 'Ben Beispiel' })).toHaveLength(1);
            await expect(canvas.getByRole('article', { name: 'Clara Dritte' })).toBeVisible();
            await expect(canvas.getByText('3 von 3')).toBeVisible();
            await expect(canvas.getByRole('button', { name: 'Weitere laden' })).toBeDisabled();
        });
    },
};

export const ConsultantsTabAt390Edit: Story = {
    ...ConsultantsTabAt390,
    play: async ({ canvasElement, userEvent: user }) => {
        const canvas = within(canvasElement);
        await user.click(await canvas.findByRole('button', { name: 'Anna Muster bearbeiten' }));
        await expect(await canvas.findByTestId('edit-target')).toHaveTextContent('/admin/users/consultants/c-1');
    },
};
