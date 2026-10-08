import type { Meta, StoryObj } from '@storybook/react-vite';
import { message } from 'antd';
import { http, HttpResponse } from 'msw';
// eslint-disable-next-line import/no-unresolved -- valid `storybook` package-exports subpath; the eslint resolver predates exports maps
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { UserRole } from '../../enums/UserRole';
import { setStoryAuth, withAdminProviders } from '../../utils/storybook/adminStoryDecorators';
import type { AccountInviteDTO, InviteEmailTemplateDTO } from '../../api/accountInvites/accountInvites';
import { CounsellorInvitesTab, TenantInvitesTab } from './AccountInvitesTab';
import { invitePanelStorageKey } from './InvitePanel';
import styles from './styles.module.scss';

const INVITES_ENDPOINT = '*/service/useradmin/account-invites';
const TEMPLATES_ENDPOINT = '*/service/useradmin/invite-email-templates';
const TENANT_SEARCH_ENDPOINT = '*/service/tenantadmin/search';

const TEMPLATES: InviteEmailTemplateDTO[] = [
    {
        id: 1,
        kind: 'TENANT_INVITE',
        name: 'Träger-Willkommen (Standard)',
        language: 'de',
        subject: 'Ihr Zugang zur Beratungsplattform',
        body: 'Hallo {{firstName}},\n\nüber diesen Link richten Sie Ihren Zugang ein: {{inviteLink}}',
        active: true,
        createDate: '2026-07-01T10:00:00Z',
        updateDate: '2026-07-05T09:00:00Z',
    },
    {
        id: 2,
        kind: 'TENANT_INVITE',
        name: 'Träger-Willkommen (englisch)',
        language: 'en',
        subject: 'Your access to the counselling platform',
        body: 'Hello {{firstName}},\n\nset up your access here: {{inviteLink}}',
        active: true,
        createDate: '2026-07-02T10:00:00Z',
        updateDate: null,
    },
    {
        id: 3,
        kind: 'COUNSELLOR_INVITE',
        name: 'Berater-Willkommen',
        language: 'de',
        subject: 'Ihr Berater-Zugang',
        body: 'Hallo {{firstName}}, hier entlang: {{inviteLink}}',
        active: true,
        createDate: '2026-07-02T10:00:00Z',
        updateDate: null,
    },
];

const INVITES: AccountInviteDTO[] = [
    {
        id: 11,
        targetRole: 'TENANT_ADMIN',
        tenantId: 2,
        recipientEmail: 'muenchen@example.org',
        firstName: 'Maria',
        lastName: 'Huber',
        agencyId: null,
        departmentId: null,
        provisioningStatus: null,
        inviteStatus: 'EMAIL_SENT',
        emailVerificationStatus: 'PENDING',
        emailDeliveryStatus: 'SENT',
        twoFactorStatus: 'NOT_REQUIRED',
        accessGateStatus: 'BLOCKED_INVITE',
        expiresAt: '2026-08-01T10:00:00Z',
        acceptedAt: null,
        revokedAt: null,
        supersededAt: null,
        twoFactorWaivedBy: null,
        twoFactorWaivedAt: null,
        twoFactorWaiverReason: null,
        createDate: '2026-07-02T10:00:00Z',
    },
    {
        id: 12,
        targetRole: 'TENANT_ADMIN',
        tenantId: 3,
        recipientEmail: 'hamburg@example.org',
        firstName: 'Jan',
        lastName: 'Petersen',
        agencyId: null,
        departmentId: null,
        provisioningStatus: null,
        inviteStatus: 'ACCEPTED',
        emailVerificationStatus: 'VERIFIED',
        emailDeliveryStatus: 'SENT',
        twoFactorStatus: 'NOT_REQUIRED',
        accessGateStatus: 'READY',
        expiresAt: '2026-07-20T10:00:00Z',
        acceptedAt: '2026-07-03T08:00:00Z',
        revokedAt: null,
        supersededAt: null,
        twoFactorWaivedBy: null,
        twoFactorWaivedAt: null,
        twoFactorWaiverReason: null,
        createDate: '2026-06-20T10:00:00Z',
    },
];

const invitesResponse = (content: AccountInviteDTO[]) =>
    HttpResponse.json({ content, totalElements: content.length, totalPages: 1, page: 0, size: 20 });

// Tenants occupy 1 and 3, the active (EMAIL_SENT) invite holds 2, the ACCEPTED
// invite on 3 is terminal. The composer's Träger-ID field starts on Auto (#570)
// and only talks to the allocation endpoints below when the admin goes manual.
const TENANTS = {
    total: 2,
    _embedded: [
        { id: 1, name: 'Demo-Träger' },
        { id: 3, name: 'Hamburg' },
    ],
};

const templatesByKind = http.get(TEMPLATES_ENDPOINT, ({ request }) => {
    const kind = new URL(request.url).searchParams.get('kind');
    return HttpResponse.json(TEMPLATES.filter((template) => !kind || template.kind === kind));
});

// Stubbed allocation endpoints (#570): ids 1–3 are taken (see TENANTS/INVITES),
// everything else is free. Register `next-free` before the `:id` catch-all.
const TAKEN_IDS = new Set([1, 2, 3]);
const idAllocationHandlers = [
    http.get('*/service/tenantadmin/id-allocation/next-free', ({ request }) => {
        const url = new URL(request.url);
        const direction = url.searchParams.get('direction') === 'down' ? -1 : 1;
        const fromParam = url.searchParams.get('from');
        let candidate = fromParam == null ? 1 : Number(fromParam) + direction;
        while (candidate >= 1 && candidate <= 999) {
            if (!TAKEN_IDS.has(candidate)) return HttpResponse.json({ id: candidate });
            candidate += direction;
        }
        return HttpResponse.json({ id: null });
    }),
    http.get('*/service/tenantadmin/id-allocation/:id', ({ params }) => {
        const id = Number(params.id);
        return HttpResponse.json({ id, state: TAKEN_IDS.has(id) ? 'ASSIGNED' : 'FREE' });
    }),
];

const defaultHandlers = [
    http.get(INVITES_ENDPOINT, () => invitesResponse(INVITES)),
    templatesByKind,
    http.get(TENANT_SEARCH_ENDPOINT, () => HttpResponse.json(TENANTS)),
    ...idAllocationHandlers,
    http.post(TEMPLATES_ENDPOINT, async ({ request }) => {
        const body = (await request.json()) as Partial<InviteEmailTemplateDTO>;
        return HttpResponse.json(
            { ...TEMPLATES[0], ...body, id: 99, createDate: '2026-07-13T10:00:00Z', updateDate: null },
            { status: 201 },
        );
    }),
    http.post(INVITES_ENDPOINT, () =>
        HttpResponse.json(
            { ...INVITES[0], id: 99, acceptUrl: 'https://admin.example/account-invite/token' },
            { status: 201 },
        ),
    ),
];

const meta = {
    title: 'Organisms/Pages/Links/TenantInvites',
    component: TenantInvitesTab,
    parameters: { layout: 'fullscreen' },
    decorators: [
        withAdminProviders,
        (Story) => {
            // Tenant id 0 with both admin roles is the platform operator.
            setStoryAuth([UserRole.TenantAdmin, UserRole.AgencyAdmin]);
            return <Story />;
        },
    ],
} satisfies Meta<typeof TenantInvitesTab>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The Träger-Invites tab in its everyday state: invites listed, templates available in
 * the select, "Vorlagen verwalten" opens the template dialog. The Träger-ID field
 * pre-fills with the smallest free id (tenants occupy 1+3, the active invite holds 2 → 4).
 */
export const Filled: Story = {
    parameters: { msw: { handlers: defaultHandlers } },
};

/** No templates exist yet — the state that used to dead-end admins before the manage dialog. */
export const NoTemplates: Story = {
    parameters: {
        msw: {
            handlers: [
                http.get(INVITES_ENDPOINT, () => invitesResponse([])),
                http.get(TEMPLATES_ENDPOINT, () => HttpResponse.json([])),
                http.get(TENANT_SEARCH_ENDPOINT, () => HttpResponse.json({ total: 0, _embedded: [] })),
                http.post(TEMPLATES_ENDPOINT, async ({ request }) => {
                    const body = (await request.json()) as Partial<InviteEmailTemplateDTO>;
                    return HttpResponse.json(
                        {
                            id: 1,
                            kind: 'TENANT_INVITE',
                            language: null,
                            active: true,
                            createDate: '2026-07-13T10:00:00Z',
                            updateDate: null,
                            ...body,
                        },
                        { status: 201 },
                    );
                }),
            ],
        },
    },
};

/**
 * Mail delivery is misconfigured (UserService#1160): the create is answered
 * `502 {"reason":"SMTP_SEND_FAILED","detail":"SMTP_CREDENTIALS_MISSING"}`.
 *
 * Reviewable state: ONE specific toast naming the cause — "E-Mail-Versand nicht
 * konfiguriert: SMTP-Zugangsdaten fehlen." — and NO generic "Link konnte nicht
 * erstellt werden" underneath it. Before this the admin saw only the two generic
 * toasts and kept retrying a form that can never succeed until SMTP is fixed.
 */
export const SmtpCredentialsMissing: Story = {
    parameters: {
        msw: {
            handlers: [
                http.get(INVITES_ENDPOINT, () => invitesResponse(INVITES)),
                // Exactly ONE active template, so the tab auto-selects it and the
                // send button is reachable without a template pick first.
                http.get(TEMPLATES_ENDPOINT, () => HttpResponse.json([TEMPLATES[0]])),
                http.get(TENANT_SEARCH_ENDPOINT, () => HttpResponse.json(TENANTS)),
                ...idAllocationHandlers,
                http.post(INVITES_ENDPOINT, () =>
                    HttpResponse.json(
                        { reason: 'SMTP_SEND_FAILED', detail: 'SMTP_CREDENTIALS_MISSING' },
                        { status: 502 },
                    ),
                ),
            ],
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.type(await canvas.findByLabelText('E-Mail'), 'neu@example.org');
        // The button re-renders while the Träger-ID allocation resolves, so re-query
        // it on every attempt instead of holding a stale node.
        const enabledSendButton = await waitFor(
            async () => {
                const button = await canvas.findByRole('button', { name: /^(Anlegen & einladen|Create & invite)$/ });
                await expect(button).toBeEnabled();
                return button;
            },
            { timeout: 10_000 },
        );
        await userEvent.click(enabledSendButton);
        // antd renders toasts in a portal outside canvasElement.
        await waitFor(
            () =>
                expect(document.body.querySelector('.ant-message')?.textContent ?? '').toContain(
                    'SMTP-Zugangsdaten fehlen',
                ),
            { timeout: 10_000 },
        );
    },
};

/**
 * The invite card folded to its 80px rail (#1117): the table takes the width,
 * and the fold survives a reload because it is stored per tab. The rail's
 * toggle opens the card again.
 */
export const FoldedRail: Story = {
    parameters: { msw: { handlers: defaultHandlers } },
    decorators: [
        (Story) => {
            window.localStorage.setItem(invitePanelStorageKey('TENANT_ADMIN'), 'true');
            return <Story />;
        },
    ],
    play: async ({ canvas }) => {
        const toggle = await canvas.findByRole('button', { name: /^(Formular ausklappen|Expand form)$/ });
        await expect(canvas.queryByRole('textbox', { name: /^(E-Mail|E-mail)$/ })).not.toBeInTheDocument();
        await userEvent.click(toggle);
        await expect(await canvas.findByRole('textbox', { name: /^(E-Mail|E-mail)$/ })).toBeVisible();
        await expect(window.localStorage.getItem(invitePanelStorageKey('TENANT_ADMIN'))).toBe('false');
    },
};

// Purpose comes from the protected server list. The setup row points to an
// already-created identity; it uses canonical setup mail, never a legacy template.
const setupResendRow: AccountInviteDTO & { onboardingPurpose: 'EXISTING_ACCOUNT_SETUP' } = {
    ...INVITES[0],
    onboardingPurpose: 'EXISTING_ACCOUNT_SETUP',
    recipientEmail: 'existing.account@example.org',
    firstName: null,
    lastName: null,
    tenantIdAllocationMode: null,
    agencyIdAllocationMode: null,
    provisioningStatus: 'PENDING',
    provisionedUserId: 'fixture-existing-identity',
    expiresAt: null,
    createDate: '2026-09-30T09:00:00Z',
};
const setupResendRequests: unknown[] = [];
let setupListReads = 0;

/** Existing setup recovery must work before an ordinary invitation template exists. */
export const SetupResendWithoutTemplates: Story = {
    beforeEach: () => {
        message.destroy();
        setupResendRequests.length = 0;
        setupListReads = 0;
    },
    parameters: {
        msw: {
            handlers: [
                http.get(INVITES_ENDPOINT, () => {
                    setupListReads += 1;
                    return invitesResponse([
                        {
                            ...setupResendRow,
                            ...(setupResendRequests.length ? { id: 91, createDate: '2026-10-01T09:00:00Z' } : {}),
                        },
                    ]);
                }),
                http.get(TEMPLATES_ENDPOINT, () => HttpResponse.json([])),
                http.get(TENANT_SEARCH_ENDPOINT, () => HttpResponse.json(TENANTS)),
                ...idAllocationHandlers,
                http.post(`${INVITES_ENDPOINT}/11/resend`, async ({ request }) => {
                    setupResendRequests.push(await request.json());
                    return HttpResponse.json({
                        ...setupResendRow,
                        id: 91,
                        createDate: '2026-10-01T09:00:00Z',
                        rawToken: null,
                        acceptUrl: null,
                    });
                }),
            ],
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await canvas.findByText('existing.account@example.org');
        await userEvent.click(canvas.getByRole('button', { name: /Erinnerung erneut senden|Resend reminder/ }));
        await waitFor(() => expect(setupResendRequests).toEqual([{}]));
        await waitFor(() => expect(setupListReads).toBeGreaterThan(1));
        await waitFor(() => expect(canvasElement.querySelector('time[datetime="2026-10-01T09:00:00Z"]')).toBeVisible());
        await expect(canvasElement.querySelector('time[datetime="2026-09-30T09:00:00Z"]')).not.toBeInTheDocument();
    },
};

const ordinaryResendRequests: unknown[] = [];
/** The setup exemption must not remove the existing ordinary invitation guard. */
export const OrdinaryResendStillRequiresTemplate: Story = {
    beforeEach: () => {
        message.destroy();
        ordinaryResendRequests.length = 0;
    },
    parameters: {
        msw: {
            handlers: [
                http.get(INVITES_ENDPOINT, () => invitesResponse([{ ...INVITES[0], expiresAt: null }])),
                http.get(TEMPLATES_ENDPOINT, () => HttpResponse.json([])),
                http.get(TENANT_SEARCH_ENDPOINT, () => HttpResponse.json(TENANTS)),
                ...idAllocationHandlers,
                http.post(`${INVITES_ENDPOINT}/11/resend`, async ({ request }) => {
                    ordinaryResendRequests.push(await request.json());
                    return HttpResponse.json(INVITES[0]);
                }),
            ],
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await canvas.findByText('muenchen@example.org');
        await userEvent.click(canvas.getByRole('button', { name: /Erinnerung erneut senden|Resend reminder/ }));
        await waitFor(() =>
            expect(
                within(document.body).getByText(/Bitte zuerst ein Template auswählen|Select a template first/),
            ).toBeVisible(),
        );
        await expect(ordinaryResendRequests).toEqual([]);
    },
};

/** A collapsed role pill must not be mistaken for the entire folded composer. */
export const IntermediateWidth: Story = {
    globals: { viewport: { value: 'desktop', isRotated: false } },
    parameters: { msw: { handlers: defaultHandlers } },
    decorators: [
        (Story) => (
            <div style={{ width: 920, maxWidth: '100%' }}>
                <Story />
            </div>
        ),
    ],
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await canvas.findByText('muenchen@example.org');
        const panel = canvasElement.querySelector(`.${styles.invitesPanel}`)!;
        const board = canvasElement.querySelector(`.${styles.invitesBoard}`)!;
        await waitFor(() =>
            expect(board.getBoundingClientRect().top).toBeGreaterThanOrEqual(panel.getBoundingClientRect().bottom),
        );
        await expect(board.getBoundingClientRect().width).toBeGreaterThan(600);
        const search = canvas.getByRole('searchbox');
        const menu = canvas.getByRole('button', { name: /More actions|Weitere Aktionen/ });
        const center = (element: HTMLElement) => {
            const rect = element.getBoundingClientRect();
            return rect.y + rect.height / 2;
        };
        const pager = canvas.getByRole('combobox', { name: /Zeilen pro Seite|Rows per page/ });
        await expect(Math.abs(center(search) - center(menu))).toBeLessThan(1);
        await expect(Math.abs(center(pager) - center(menu))).toBeLessThan(1);
        const table = canvas.getByRole('table');
        await expect(getComputedStyle(table.parentElement!).overflowX).toBe('visible');
    },
};

/** A tenant administrator sees their own carrier's name without an agency lookup. */
export const OwnTenantCounsellor: Story = {
    parameters: {
        msw: {
            handlers: [
                http.get('*/service/tenantadmin/25', () => HttpResponse.json({ id: 25, name: 'Caritas Südbaden' })),
                ...defaultHandlers,
            ],
        },
    },
    render: () => {
        setStoryAuth([UserRole.TenantAdmin], 25);
        return <CounsellorInvitesTab />;
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await canvas.findByText('Caritas Südbaden');
        const field = canvas.getByRole('combobox', { name: /^(Träger|Tenant)$/ });
        await expect(field).toBeDisabled();
        await expect(field).toHaveValue('Nr. 25');
    },
};

/** The longer tenant row switches to cards before it can overflow a tablet-width board. */
export const TabletWidth: Story = {
    globals: { viewport: { value: 'desktop', isRotated: false } },
    parameters: { msw: { handlers: defaultHandlers } },
    decorators: [
        (Story) => (
            <div style={{ width: 820, maxWidth: '100%' }}>
                <Story />
            </div>
        ),
    ],
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await canvas.findByText('muenchen@example.org');
        await waitFor(() => expect(getComputedStyle(canvas.getByRole('table')).display).toBe('block'));
        const board = canvasElement.querySelector(`.${styles.invitesBoard}`)!;
        expect(board.scrollWidth).toBeLessThanOrEqual(board.clientWidth);
    },
};

/** The entire phone toolbar scrolls locally while the rest of the page stays contained. */
export const PhoneToolbar: Story = {
    ...IntermediateWidth,
    decorators: [
        (Story) => (
            <div style={{ width: 390, maxWidth: '100%' }}>
                <Story />
            </div>
        ),
    ],
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await canvas.findByText('muenchen@example.org');
        const search = canvas.getByRole('searchbox');
        const pager = canvas.getByRole('combobox', { name: /Zeilen pro Seite|Rows per page/ });
        const menu = canvas.getByRole('button', { name: /More actions|Weitere Aktionen/ });
        const toolbar = search.closest('[class*="toolbarRow"]') as HTMLElement;
        const center = (element: HTMLElement) => {
            const rect = element.getBoundingClientRect();
            return rect.top + rect.height / 2;
        };
        await expect(Math.abs(center(search) - center(pager))).toBeLessThan(1);
        await expect(Math.abs(center(pager) - center(menu))).toBeLessThan(1);
        await expect(getComputedStyle(toolbar).flexWrap).toBe('nowrap');
        await expect(getComputedStyle(toolbar).overflowX).toBe('auto');
        await expect(toolbar.scrollWidth).toBeGreaterThan(toolbar.clientWidth);
        toolbar.scrollLeft = toolbar.scrollWidth;
        await waitFor(() =>
            expect(menu.getBoundingClientRect().right).toBeLessThanOrEqual(toolbar.getBoundingClientRect().right + 1),
        );
    },
};
