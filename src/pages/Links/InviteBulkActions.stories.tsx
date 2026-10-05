import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse } from 'msw';
// eslint-disable-next-line import/no-unresolved -- valid `storybook` package-exports subpath; the eslint resolver predates exports maps
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { message } from 'antd';
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

const SETUP_ROWS: AccountInviteDTO[] = [
    invite(31, 2, 'setup.draft@example.org', 'DRAFT'),
    invite(32, 3, 'setup.sent@example.org', 'EMAIL_SENT'),
].map((row) => ({
    ...row,
    onboardingPurpose: 'EXISTING_ACCOUNT_SETUP',
    provisionedUserId: `fixture-existing-${row.id}`,
    provisioningStatus: 'PENDING',
    tenantIdAllocationMode: null,
    expiresAt: null,
}));
const bulkSetupRequests: { id: string; body: unknown }[] = [];
const bulkOrdinaryRequests: unknown[] = [];
let bulkListReads = 0;
const rowsResponse = (rows: AccountInviteDTO[]) =>
    HttpResponse.json({
        content: rows,
        totalElements: rows.length,
        totalPages: 1,
        page: 0,
        size: 20,
    });

/** Real checkbox → toolbar → protected HTTP POST, including a never-sent setup row. */
export const SetupOnlyWithoutTemplates: Story = {
    beforeEach: () => {
        message.destroy();
        bulkSetupRequests.length = 0;
        bulkOrdinaryRequests.length = 0;
        bulkListReads = 0;
    },
    parameters: {
        msw: {
            handlers: [
                http.get(INVITES_ENDPOINT, () => {
                    bulkListReads += 1;
                    return rowsResponse(
                        SETUP_ROWS.map((row) => ({
                            ...row,
                            ...(bulkSetupRequests.length === 2
                                ? {
                                      id: row.id + 100,
                                      createDate: '2026-10-01T12:00:00Z',
                                      inviteStatus: 'EMAIL_SENT' as const,
                                  }
                                : {}),
                        })),
                    );
                }),
                http.get(TEMPLATES_ENDPOINT, () => HttpResponse.json([])),
                http.get(TENANT_SEARCH_ENDPOINT, () => HttpResponse.json({ total: 0, _embedded: [] })),
                http.post(`${INVITES_ENDPOINT}/:id/resend`, async ({ params, request }) => {
                    bulkSetupRequests.push({ id: String(params.id), body: await request.json() });
                    const row = SETUP_ROWS.find((candidate) => candidate.id === Number(params.id));
                    return HttpResponse.json({ ...row, id: Number(params.id) + 100, acceptUrl: null, rawToken: null });
                }),
                http.post(`${INVITES_ENDPOINT}/:id/send`, async ({ request }) => {
                    bulkOrdinaryRequests.push(await request.json());
                    return HttpResponse.json({ reason: 'WRONG_SETUP_ROUTE' }, { status: 400 });
                }),
            ],
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await selectRow(canvasElement, 'setup.draft@example.org');
        await selectRow(canvasElement, 'setup.sent@example.org');
        const send = await canvas.findByRole('button', { name: /2 ausgewählte senden|Send 2 selected/ });
        await expect(send).toBeEnabled();
        await userEvent.click(send);
        await waitFor(() =>
            expect(bulkSetupRequests).toEqual([
                { id: '31', body: {} },
                { id: '32', body: {} },
            ]),
        );
        await expect(bulkOrdinaryRequests).toEqual([]);
        await waitFor(() => expect(bulkListReads).toBeGreaterThan(1));
        await Promise.all(
            SETUP_ROWS.map(async (row) => {
                const refreshedRow = (await canvas.findByText(row.recipientEmail)).closest('tr');
                await waitFor(() =>
                    expect(refreshedRow?.querySelector('time[datetime="2026-10-01T12:00:00Z"]')).toBeVisible(),
                );
            }),
        );
        await expect(canvasElement.querySelector('time[datetime="2026-07-02T10:00:00Z"]')).not.toBeInTheDocument();
        await expect(
            canvas.queryByRole('button', { name: /2 ausgewählte senden|Send 2 selected/ }),
        ).not.toBeInTheDocument();
    },
};

/** Adding one ordinary row retains its template guard and sends no part of the batch. */
export const MixedSelectionRequiresTemplate: Story = {
    beforeEach: () => {
        message.destroy();
        bulkSetupRequests.length = 0;
        bulkOrdinaryRequests.length = 0;
    },
    parameters: {
        msw: {
            handlers: [
                http.get(INVITES_ENDPOINT, () =>
                    rowsResponse([
                        SETUP_ROWS[0],
                        { ...invite(33, 4, 'ordinary@example.org', 'DRAFT'), expiresAt: null },
                    ]),
                ),
                http.get(TEMPLATES_ENDPOINT, () => HttpResponse.json([])),
                http.get(TENANT_SEARCH_ENDPOINT, () => HttpResponse.json({ total: 0, _embedded: [] })),
                http.post(`${INVITES_ENDPOINT}/:id/resend`, async ({ params, request }) => {
                    bulkSetupRequests.push({ id: String(params.id), body: await request.json() });
                    return HttpResponse.json(SETUP_ROWS[0]);
                }),
                http.post(`${INVITES_ENDPOINT}/:id/send`, async ({ request }) => {
                    bulkOrdinaryRequests.push(await request.json());
                    return HttpResponse.json(SETUP_ROWS[0]);
                }),
            ],
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await selectRow(canvasElement, 'setup.draft@example.org');
        await selectRow(canvasElement, 'ordinary@example.org');
        const send = await canvas.findByRole('button', { name: /2 ausgewählte senden|Send 2 selected/ });
        await expect(send).toBeDisabled();
        await expect(send).toHaveAccessibleDescription(
            /Bitte zuerst eine E-Mail-Vorlage auswählen|Select an email template first/,
        );
        await expect(bulkSetupRequests).toEqual([]);
        await expect(bulkOrdinaryRequests).toEqual([]);
    },
};
