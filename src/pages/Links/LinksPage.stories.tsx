import type { Meta, StoryObj } from '@storybook/react-vite';
import { Route, Routes } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
// eslint-disable-next-line import/no-unresolved -- valid `storybook` package-exports subpath; the eslint resolver predates exports maps
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { UserRole } from '../../enums/UserRole';
import { setStoryAuth, withAdminProviders } from '../../utils/storybook/adminStoryDecorators';
import { CounsellorInvitesTab, LinksPage, TenantInvitesTab } from './index';

// A factory, not a constant: a `Response` body can only be read once, so
// handing the same instance to a second request makes MSW throw
// "Failed to execute 'clone' on 'Response': Response body is already used".
const emptyList = () => HttpResponse.json({ content: [], totalElements: 0, totalPages: 0, page: 0, size: 20 });

/**
 * Full Links page shell — the pill tab row ("Träger-Invites" / "Berater-Invites" /
 * "Externe Inbounds") plus the "Mein Zugang" button — with the tenant invites tab
 * mounted as its outlet. Exists mainly to review header spacing and tab styling.
 */
const meta = {
    title: 'Organisms/Pages/Links/LinksPage',
    component: LinksPage,
    parameters: {
        layout: 'fullscreen',
        msw: {
            handlers: [
                http.get('*/service/useradmin/account-invites', () => emptyList()),
                http.get('*/service/useradmin/invite-email-templates', () => HttpResponse.json([])),
                http.get('*/service/tenantadmin/search', () => HttpResponse.json({ total: 0, _embedded: [] })),
            ],
        },
    },
    decorators: [withAdminProviders],
} satisfies Meta<typeof LinksPage>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Wraps a story in the router shell the page needs: the global preview decorator already
 * provides a MemoryRouter (at '/'); a catch-all route mounts the page there and an index
 * route fills its Outlet, so the tab NavLinks render without a second (crashing) router.
 */
const withOutlet =
    (roles: UserRole[], tenantId: number, outlet: React.ReactElement) => (Story: () => React.ReactElement) => {
        setStoryAuth(roles, tenantId);
        return (
            <Routes>
                <Route path="*" element={<Story />}>
                    <Route index element={outlet} />
                </Route>
            </Routes>
        );
    };

/** Platform admin (tenantId 0): all three tabs — Träger-Invites, Berater-Invites, Externe Inbounds. */
export const PlatformAdmin: Story = {
    decorators: [withOutlet([UserRole.TenantAdmin, UserRole.AgencyAdmin], 0, <TenantInvitesTab />)],
};

/** Träger admin: "Berater-Invites"; the platform-only tabs are shown disabled. */
export const TenantAdmin: Story = {
    decorators: [withOutlet([UserRole.TenantAdmin, UserRole.UserAdmin], 7, <CounsellorInvitesTab />)],
};

// The backend scopes the agency search to an agency admin's own agencies; these handlers do the same.
const agencyHit = (id: number, name: string) => ({
    _embedded: { id, name, tenantId: 40, tenantName: 'Caritas Freiburg', topics: [], deleteDate: 'null' },
});
const ownAgenciesHandler = (agencies: Array<{ id: number; name: string }>) =>
    http.get('*/service/agencyadmin/agencies', () =>
        HttpResponse.json({ total: agencies.length, _embedded: agencies.map(({ id, name }) => agencyHit(id, name)) }),
    );
const COUNSELLOR_TEMPLATE = {
    id: 3,
    kind: 'COUNSELLOR_INVITE',
    name: 'Berater:innen-Willkommen',
    language: 'de',
    subject: 'Willkommen',
    body: 'Hallo',
    active: true,
    createDate: '2026-09-01T00:00:00Z',
    updateDate: null,
};
const agencyAdminHandlers = (agencies: Array<{ id: number; name: string }>) => [
    http.get('*/service/useradmin/account-invites', () => emptyList()),
    http.get('*/service/useradmin/invite-email-templates', () => HttpResponse.json([COUNSELLOR_TEMPLATE])),
    ownAgenciesHandler(agencies),
];

/** Agency admin of one Beratungsstelle: Rolle, Träger and Beratungsstelle locked, no CSV import. */
export const AgencyAdmin: Story = {
    parameters: { msw: { handlers: agencyAdminHandlers([{ id: 101, name: 'Caritas Suchtberatung Freiburg' }]) } },
    decorators: [withOutlet([UserRole.AgencyAdmin, UserRole.UserAdmin], 40, <CounsellorInvitesTab />)],
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const agency = await canvas.findByRole('combobox', { name: /^(Beratungsstelle|Agency)$/ });
        await waitFor(() => expect(agency).toHaveValue('Caritas Suchtberatung Freiburg · 101'), { timeout: 5_000 });
        await expect(agency).toBeDisabled();
        await expect(canvas.getByRole('combobox', { name: /^(Träger|Tenant)$/ })).toBeDisabled();
        // One role on offer: „Rolle" is fixed on „Berater:in".
        await expect(canvas.getByRole('combobox', { name: /^(Rolle|Role)$/ })).toBeDisabled();
        // Platform-only tabs stay visible, disabled, and say why.
        await expect(canvas.queryByRole('link', { name: /Träger-Invites|Tenant invites/ })).toBeNull();
        const tenantTab = canvas.getByText(/Träger-Invites|Tenant invites/).closest('[aria-disabled="true"]');
        await expect(tenantTab).not.toBeNull();
        (tenantTab as HTMLElement).focus();
        await expect(await within(canvasElement.ownerDocument.body).findByRole('tooltip')).toHaveTextContent(
            /Nur Plattform-Admins|Platform admins only/,
        );
    },
};

/** A restricted agency admin gets the same, locked bar. */
export const RestrictedAgencyAdmin: Story = {
    parameters: { msw: { handlers: agencyAdminHandlers([{ id: 101, name: 'Caritas Suchtberatung Freiburg' }]) } },
    decorators: [withOutlet([UserRole.RestrictedAgencyAdmin, UserRole.UserAdmin], 40, <CounsellorInvitesTab />)],
};

/** Agency admin of several Beratungsstellen: picks among them only, never a new one. */
export const AgencyAdminSeveralAgencies: Story = {
    parameters: {
        msw: {
            handlers: agencyAdminHandlers([
                { id: 101, name: 'Caritas Suchtberatung Freiburg' },
                { id: 102, name: 'Caritas Schuldnerberatung Freiburg' },
            ]),
        },
    },
    decorators: [withOutlet([UserRole.AgencyAdmin, UserRole.UserAdmin], 40, <CounsellorInvitesTab />)],
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const body = within(canvasElement.ownerDocument.body);
        const agency = await canvas.findByRole('combobox', { name: /^(Beratungsstelle|Agency)$/ });
        await expect(agency).toBeEnabled();
        await userEvent.click(agency);
        await expect(await body.findByRole('option', { name: /Caritas Schuldnerberatung Freiburg/ })).toBeVisible();
        await expect(body.queryByRole('option', { name: /Neu anlegen|Create new/ })).toBeNull();
    },
};
