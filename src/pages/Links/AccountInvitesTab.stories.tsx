import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse } from 'msw';
import { UserRole } from '../../enums/UserRole';
import { setStoryAuth, withAdminProviders } from '../../utils/storybook/adminStoryDecorators';
import type { AccountInviteDTO, InviteEmailTemplateDTO } from '../../api/accountInvites/accountInvites';
import { TenantInvitesTab } from './AccountInvitesTab';

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
            setStoryAuth([UserRole.TenantAdmin]);
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
