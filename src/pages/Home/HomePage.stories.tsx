import type { Meta, StoryObj } from '@storybook/react-vite';
import type { QueryClient } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
// eslint-disable-next-line import/no-unresolved -- valid `storybook` package-exports subpath; the eslint resolver predates exports maps
import { expect, waitFor } from 'storybook/test';
import { UserRole } from '../../enums/UserRole';
import { USER_DATA_KEY } from '../../hooks/useUserData.hook';
import { setStoryAuth, withSeededAdminProviders } from '../../utils/storybook/adminStoryDecorators';
import { HomePage } from './HomePage';
import { homeFactKey } from './useHomeFacts';

/** Counts as `useHomeFacts` caches them for the story's tenant; a story needs no network. */
const seedFacts = (tenantId: number, facts: Record<string, unknown>) => (client: QueryClient) => {
    client.setQueryData([USER_DATA_KEY], { firstName: 'Kim' });
    Object.entries(facts).forEach(([key, value]) => client.setQueryData(homeFactKey(tenantId, key), value));
};

/** Requests the page and its providers make on mount; without them the global error toast covers the greeting. */
const BASE_HANDLERS = [
    http.get('*/service/users/data', () => HttpResponse.json({ firstName: 'Kim' })),
    http.get('*/service/tenant/public/*', () => HttpResponse.json({ id: 1, name: 'Demo', settings: {} })),
];

/** The DPA status comes from the gate's shared query, so stories answer the endpoint instead of seeding it. */
const dpaStatus = (status: string | null) =>
    http.get('*/service/tenantadmin/:tenantId/dpa/status', () =>
        status ? HttpResponse.json({ status }) : new HttpResponse(null, { status: 500 }),
    );

const TRAEGER_ROLES = [UserRole.TenantAdmin, UserRole.AgencyAdmin, UserRole.UserAdmin];

/** The page fades in; wait until an element is really visible before asserting on the rest. */
const visible = (element: () => HTMLElement) =>
    waitFor(() => {
        const node = element();
        expect(node).toBeVisible();
        return node;
    });

const meta = {
    title: 'Pages/Home',
    component: HomePage,
    parameters: {
        layout: 'fullscreen',
        msw: { handlers: BASE_HANDLERS },
    },
} satisfies Meta<typeof HomePage>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Platform admin at the very start: no Träger yet, so the checklist leads. */
export const PlatformAdminFirstLogin: Story = {
    decorators: [
        (Story) => {
            setStoryAuth([UserRole.TenantAdmin, UserRole.AgencyAdmin], 0);
            return withSeededAdminProviders(
                Story,
                seedFacts(0, {
                    'own-tenant': { appearanceComplete: true, smtpMode: 'PLATFORM' },
                    tenants: 0,
                    agencies: 0,
                    consultants: 0,
                    'invites-tenant': { PREPARED: 0 },
                    'invites-unit': { INVITED: 2 },
                }),
            );
        },
    ],
    play: async ({ canvas }) => {
        const hero = await visible(() => canvas.getByRole('banner'));
        await expect(canvas.getByRole('link', { name: /^(Träger einladen|Invite an organisation)$/ })).toHaveAttribute(
            'href',
            '/admin/links/tenants',
        );
        // No admin tour ships yet (adminTours is empty), so Home offers none.
        await expect(hero).not.toHaveTextContent(/Rundgang|tour/i);
        const current = canvas.getByRole('link', { current: 'step' });
        await expect(current).toHaveAccessibleName(/^(Ersten Träger einladen|Invite your first organisation)/);
        await expect(current).toHaveAccessibleName(/(Weiter|Continue)$/);
        await expect(canvas.getByText(/^(Platzhalter · ca\. 3 Min\.|Placeholder · approx\. 3 min)$/)).toBeVisible();
        await expect(
            canvas.getByRole('link', {
                name: /^(Beratungsstellen-Admin einladen|Invite counselling centre admins)$/,
            }),
        ).toHaveAttribute('href', '/admin/links/counsellor');
    },
};

/** Träger admin (usual role bundle) halfway through: one Beratungsstelle, invitations out, one stuck. */
export const TraegerAdmin: Story = {
    parameters: { msw: { handlers: [...BASE_HANDLERS, dpaStatus('UNSIGNED')] } },
    decorators: [
        (Story) => {
            setStoryAuth(TRAEGER_ROLES, 7);
            return withSeededAdminProviders(
                Story,
                seedFacts(7, {
                    // Own mail server not finished (#1374); the AVV is still unsigned (handler below).
                    'own-tenant': { appearanceComplete: true, smtpMode: 'OWN', smtpComplete: false },
                    agencies: 1,
                    consultants: 0,
                    'invites-unit': { INVITED: 3, NEEDS_ACTION: 1, DONE: 0 },
                }),
            );
        },
    ],
    play: async ({ canvas }) => {
        await visible(() => canvas.getByRole('banner'));
        // The AVV status arrives from the DPA endpoint after the first paint; until then the step is "unknown".
        await waitFor(() =>
            expect(canvas.getByRole('link', { current: 'step' })).toHaveAccessibleName(
                /^(Auftragsverarbeitungsvertrag|Sign the data processing)/,
            ),
        );
        await expect(
            canvas.getByRole('link', { name: /^(Einladen|Invite)\s*(1 braucht Aktion|1 needs action)$/ }),
        ).toBeVisible();
        await expect(
            canvas.getByRole('link', { name: /^(Email Server|E-?mail server).*(Unvollständig|Incomplete)$/i }),
        ).toBeVisible();
        await expect(
            canvas.getByRole('link', { name: /^(Beratungsstellen-Admin einladen|Invite counselling centre admins)$/ }),
        ).toBeVisible();
        await expect(canvas.getByRole('link', { name: /^(Beratungsstellen|Counselling centres)\s*1$/ })).toBeVisible();
    },
};

/** Beratungsstellen admin: their agency, invitations, nothing from Träger level. */
export const BeratungsstellenAdmin: Story = {
    decorators: [
        (Story) => {
            setStoryAuth([UserRole.RestrictedAgencyAdmin, UserRole.UserAdmin], 7);
            return withSeededAdminProviders(
                Story,
                seedFacts(7, {
                    'agency-complete': false,
                    agencies: 1,
                    consultants: 4,
                    'invites-unit': { INVITED: 2 },
                }),
            );
        },
    ],
    play: async ({ canvas }) => {
        await visible(() => canvas.getByRole('banner'));
        await expect(
            canvas.getAllByRole('link', { name: /^(Beratende einladen|Invite counsellors)$/ })[0],
        ).toHaveAttribute('href', '/admin/links/counsellor');
        await expect(
            canvas.queryByRole('link', {
                name: /^(Beratungsstellen-Admin einladen|Invite counselling centre admins)$/,
            }),
        ).toBeNull();
        await expect(canvas.queryByText(/Träger/)).toBeNull();
    },
};

/** Träger admin with everything set up: the checklist is gone, the own mail server reads "set up". */
export const AllStepsDone: Story = {
    parameters: { msw: { handlers: [...BASE_HANDLERS, dpaStatus('VALID')] } },
    decorators: [
        (Story) => {
            setStoryAuth(TRAEGER_ROLES, 7);
            return withSeededAdminProviders(
                Story,
                seedFacts(7, {
                    'own-tenant': { appearanceComplete: true, smtpMode: 'OWN', smtpComplete: true },
                    agencies: 3,
                    consultants: 12,
                    'invites-unit': { INVITED: 1, DONE: 12 },
                }),
            );
        },
    ],
    play: async ({ canvas }) => {
        await visible(() => canvas.getByRole('banner'));
        await waitFor(() =>
            expect(canvas.queryByRole('region', { name: /^(Erste Schritte|First steps)$/ })).toBeNull(),
        );
        await expect(
            canvas.getByRole('link', { name: /^(Email Server|E-?mail server).*(Eingerichtet|Set up)$/i }),
        ).toBeVisible();
        await expect(canvas.queryByText(/braucht Aktion|brauchen Aktion|need(s)? action/)).toBeNull();
    },
};

/** Nothing could be loaded: steps say so in text, none leads, no counts, no badge. */
export const UnknownFacts: Story = {
    parameters: {
        msw: {
            handlers: [
                ...BASE_HANDLERS,
                dpaStatus(null),
                // Answers without a total: Home must show "unknown", not zero.
                http.get('*/service/agencyadmin/agencies', () => HttpResponse.json({})),
                http.get('*/service/users/consultants/search', () => HttpResponse.json({})),
                http.get('*/service/useradmin/account-invites', () => HttpResponse.json({})),
            ],
        },
    },
    decorators: [
        (Story) => {
            setStoryAuth(TRAEGER_ROLES, 7);
            return withSeededAdminProviders(Story, seedFacts(7, { 'own-tenant': null }));
        },
    ],
    play: async ({ canvas }) => {
        const checklist = await visible(() => canvas.getByRole('region', { name: /^(Erste Schritte|First steps)$/ }));
        await waitFor(() => expect(checklist).toHaveTextContent(/(0 von 3 erledigt|0 of 3 done)/));
        await expect(canvas.queryByRole('link', { current: 'step' })).toBeNull();
        await expect(
            canvas.getAllByText(/^(Status konnte nicht geladen werden|Status could not be loaded)$/).length,
        ).toBe(3);
        await expect(canvas.queryByText(/(Einladungen?|invitations?) (offen|open)/)).toBeNull();
        await expect(canvas.getByRole('link', { name: /^(Beratungsstellen|Counselling centres)$/ })).toBeVisible();
    },
};

/** The Träger admin on a phone: hero action, checklist and tiles stack in one column. */
export const Phone390: Story = {
    ...TraegerAdmin,
    globals: { viewport: { value: 'phone', isRotated: false } },
    play: async ({ canvas }) => {
        await visible(() => canvas.getByRole('banner'));
        await visible(() => canvas.getByRole('link', { current: 'step' }));
        await expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
    },
};
