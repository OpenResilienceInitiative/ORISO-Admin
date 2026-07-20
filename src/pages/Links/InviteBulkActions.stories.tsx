import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse } from 'msw';
// eslint-disable-next-line import/no-unresolved -- valid `storybook` package-exports subpath; the eslint resolver predates exports maps
import { userEvent, within } from 'storybook/test';
import { UserRole } from '../../enums/UserRole';
import { setStoryAuth, withAdminProviders } from '../../utils/storybook/adminStoryDecorators';
import type {
    AccountInviteDTO,
    AccountInviteStatus,
    InviteEmailTemplateDTO,
} from '../../api/accountInvites/accountInvites';
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
        updateDate: null,
    },
];

const invite = (
    id: number,
    tenantId: number,
    recipientEmail: string,
    inviteStatus: AccountInviteStatus,
): AccountInviteDTO => ({
    id,
    targetRole: 'TENANT_ADMIN',
    tenantId,
    recipientEmail,
    firstName: null,
    lastName: null,
    agencyId: null,
    departmentId: null,
    provisioningStatus: null,
    inviteStatus,
    emailVerificationStatus: 'PENDING',
    emailDeliveryStatus: inviteStatus === 'DRAFT' ? null : 'SENT',
    twoFactorStatus: 'NOT_REQUIRED',
    accessGateStatus: inviteStatus === 'ACCEPTED' ? 'READY' : 'BLOCKED_INVITE',
    expiresAt: '2026-08-01T10:00:00Z',
    acceptedAt: inviteStatus === 'ACCEPTED' ? '2026-07-10T08:00:00Z' : null,
    revokedAt: inviteStatus === 'REVOKED' ? '2026-07-11T08:00:00Z' : null,
    supersededAt: inviteStatus === 'SUPERSEDED' ? '2026-07-12T08:00:00Z' : null,
    twoFactorWaivedBy: null,
    twoFactorWaivedAt: null,
    twoFactorWaiverReason: null,
    createDate: '2026-07-02T10:00:00Z',
});

/**
 * Every send state once (#316): only the DRAFT and EMAIL_SENT rows get an
 * enabled checkbox — the terminal states render a disabled one.
 */
const MIXED_INVITES: AccountInviteDTO[] = [
    invite(11, 2, 'entwurf@example.org', 'DRAFT'),
    invite(12, 3, 'gesendet@example.org', 'EMAIL_SENT'),
    invite(13, 4, 'angenommen@example.org', 'ACCEPTED'),
    invite(14, 5, 'abgelaufen@example.org', 'EXPIRED'),
    invite(15, 6, 'widerrufen@example.org', 'REVOKED'),
    invite(16, 7, 'ersetzt@example.org', 'SUPERSEDED'),
];

const handlers = [
    http.get(INVITES_ENDPOINT, () =>
        HttpResponse.json({
            content: MIXED_INVITES,
            totalElements: MIXED_INVITES.length,
            totalPages: 1,
            page: 0,
            size: 20,
        }),
    ),
    http.get(TEMPLATES_ENDPOINT, () => HttpResponse.json(TEMPLATES)),
    http.get(TENANT_SEARCH_ENDPOINT, () => HttpResponse.json({ total: 1, _embedded: [{ id: 1, name: 'Demo' }] })),
    http.post(`${INVITES_ENDPOINT}/:id/resend`, ({ params }) =>
        HttpResponse.json({
            ...MIXED_INVITES[0],
            id: Number(params.id),
            inviteStatus: 'EMAIL_SENT',
            acceptUrl: 'https://admin.example/account-invite/token',
        }),
    ),
    http.post(`${INVITES_ENDPOINT}/:id/revoke`, ({ params }) =>
        HttpResponse.json({ ...MIXED_INVITES[0], id: Number(params.id), inviteStatus: 'REVOKED' }),
    ),
];

const meta = {
    title: 'Organisms/Pages/Links/InviteBulkActions',
    component: TenantInvitesTab,
    parameters: { layout: 'fullscreen', msw: { handlers } },
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

const selectRow = async (canvasElement: HTMLElement, email: string) => {
    const canvas = within(canvasElement);
    const row = (await canvas.findByText(email)).closest('tr') as HTMLElement;
    await userEvent.click(within(row).getByRole('checkbox'));
};

/** All six send states as chips; terminal rows carry a disabled checkbox. */
export const MixedStates: Story = {};

/**
 * Two active rows checked: "2 ausgewählt" above the table, the send split
 * button flips to "2 ausgewählte senden", and "Ausgewählte löschen" becomes
 * enabled in the "⋮" more-menu.
 */
export const TwoSelected: Story = {
    play: async ({ canvasElement }) => {
        await selectRow(canvasElement, 'entwurf@example.org');
        await selectRow(canvasElement, 'gesendet@example.org');
    },
};

/**
 * The "Ausgewählte löschen" confirmation: the dialog is explicit that deleting
 * means revoking — links become invalid, entries stay visible as "Widerrufen".
 */
export const DeleteConfirmOpen: Story = {
    play: async ({ canvasElement }) => {
        await selectRow(canvasElement, 'entwurf@example.org');
        await selectRow(canvasElement, 'gesendet@example.org');
        const canvas = within(canvasElement);
        await userEvent.click(await canvas.findByRole('button', { name: 'Weitere Aktionen' }));
        // Dropdown + modal render in portals outside the canvas element.
        const body = within(canvasElement.ownerDocument.body);
        await userEvent.click(await body.findByRole('menuitem', { name: /Ausgewählte löschen/ }));
        await body.findByText(/widerrufen\?/i);
    },
};
