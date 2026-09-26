import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- valid `storybook` package-exports subpath; the eslint resolver predates exports maps
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import type { TopicPermission } from '../inviteModel';
import type { AccountInviteDTO } from '../../../api/accountInvites/accountInvites';
import { InviteProgressBoard } from './InviteProgressBoard';

/**
 * The Onboarding tracking board of the Links page: summary tiles (click =
 * bucket filter), status chips, the phase-progress table and client-side
 * pagination. Träger run the five-phase track (Eingeladen → Registriert →
 * AVV bestätigt → 2FA aktiv → Abgeschlossen), Berater the three-phase track.
 * Dead invites (abgelaufen/widerrufen/ersetzt) carry the magenta error role.
 */
const meta = {
    title: 'Organisms/Pages/Links/InviteProgress',
    component: InviteProgressBoard,
    parameters: { layout: 'padded' },
    args: {
        invites: [],
        loading: false,
        targetRole: 'TENANT_ADMIN',
        selectedIds: [],
        onSelectionChange: () => {},
        isRowSelectable: () => false,
        onResend: () => {},
        onCopyLink: () => {},
        onRevoke: () => {},
    },
} satisfies Meta<typeof InviteProgressBoard>;

export default meta;
type Story = StoryObj<typeof meta>;

let nextId = 0;
const tenantInvite = (overrides: Partial<AccountInviteDTO>): AccountInviteDTO => {
    nextId += 1;
    return {
        id: nextId,
        targetRole: 'TENANT_ADMIN',
        tenantId: 20 + nextId,
        recipientEmail: 'invite@example.org',
        firstName: null,
        lastName: null,
        agencyId: null,
        departmentId: null,
        provisioningStatus: null,
        inviteStatus: 'EMAIL_SENT',
        emailVerificationStatus: 'PENDING',
        emailDeliveryStatus: 'SENT',
        twoFactorStatus: 'NOT_REQUIRED',
        accessGateStatus: 'BLOCKED_INVITE',
        expiresAt: '2026-09-05T10:00:00Z',
        acceptedAt: null,
        revokedAt: null,
        supersededAt: null,
        twoFactorWaivedBy: null,
        twoFactorWaivedAt: null,
        twoFactorWaiverReason: null,
        createDate: '2026-08-01T09:00:00Z',
        ...overrides,
    };
};

/** 9 Träger rows covering every phase/stepper state — synthetic names, no lorem ipsum. */
const TENANT_INVITES: AccountInviteDTO[] = [
    tenantInvite({
        firstName: 'Maria',
        lastName: 'Huber',
        recipientEmail: 'verwaltung@caritas-muenchen-sued.example.org',
        createDate: '2026-08-10T09:12:00Z',
    }),
    tenantInvite({
        firstName: 'Jan',
        lastName: 'Petersen',
        recipientEmail: 'onboarding@diakonie-hamburg-nord.example.org',
        inviteStatus: 'ACCEPTED',
        acceptedAt: '2026-08-09T14:30:00Z',
        emailVerificationStatus: 'VERIFIED',
        twoFactorStatus: 'PENDING_SETUP',
        accessGateStatus: 'BLOCKED_TWO_FACTOR',
        createDate: '2026-08-04T08:00:00Z',
    }),
    tenantInvite({
        firstName: 'Sabine',
        lastName: 'Vogel',
        recipientEmail: 'leitung@skf-koeln.example.org',
        inviteStatus: 'ACCEPTED',
        acceptedAt: '2026-08-08T11:05:00Z',
        twoFactorStatus: 'ACTIVE',
        accessGateStatus: 'BLOCKED_EMAIL',
        createDate: '2026-08-03T10:20:00Z',
    }),
    tenantInvite({
        firstName: 'Heinrich',
        lastName: 'Keßler',
        recipientEmail: 'traeger@caritas-dresden.example.org',
        inviteStatus: 'ACCEPTED',
        acceptedAt: '2026-07-28T16:45:00Z',
        emailVerificationStatus: 'VERIFIED',
        twoFactorStatus: 'ACTIVE',
        accessGateStatus: 'READY',
        createDate: '2026-07-21T09:00:00Z',
    }),
    tenantInvite({
        firstName: 'Ayşe',
        lastName: 'Demir',
        recipientEmail: 'kontakt@jugendhilfe-frankfurt.example.org',
        inviteStatus: 'DRAFT',
        emailDeliveryStatus: null,
        createDate: '2026-08-11T15:40:00Z',
    }),
    tenantInvite({
        firstName: 'Thomas',
        lastName: 'Brandt',
        recipientEmail: 'postfach@beratung-erfurt.example.org',
        emailDeliveryStatus: 'FAILED',
        createDate: '2026-08-06T12:00:00Z',
    }),
    tenantInvite({
        firstName: 'Claudia',
        lastName: 'Winter',
        recipientEmail: 'info@familienhilfe-bremen.example.org',
        inviteStatus: 'EXPIRED',
        expiresAt: '2026-08-01T10:00:00Z',
        createDate: '2026-07-01T10:00:00Z',
    }),
    tenantInvite({
        firstName: 'Ralf',
        lastName: 'Neumann',
        recipientEmail: 'verwaltung@sozialwerk-kiel.example.org',
        inviteStatus: 'REVOKED',
        emailDeliveryStatus: null,
        revokedAt: '2026-08-05T09:30:00Z',
        createDate: '2026-07-30T09:00:00Z',
    }),
    tenantInvite({
        firstName: 'Petra',
        lastName: 'Sommer',
        recipientEmail: 'traeger@caritas-augsburg.example.org',
        inviteStatus: 'SUPERSEDED',
        supersededAt: '2026-08-07T13:00:00Z',
        createDate: '2026-07-25T09:00:00Z',
    }),
];

const counsellorInvite = (overrides: Partial<AccountInviteDTO>): AccountInviteDTO =>
    tenantInvite({ targetRole: 'COUNSELLOR', tenantId: 7, ...overrides });

const COUNSELLOR_INVITES: AccountInviteDTO[] = [
    counsellorInvite({
        firstName: 'Lisa',
        lastName: 'Simpson',
        recipientEmail: 'lisa.simpson@beratung-springfield.example.org',
        createDate: '2026-08-10T10:00:00Z',
    }),
    counsellorInvite({
        firstName: 'Nadine',
        lastName: 'Albrecht',
        recipientEmail: 'nadine.albrecht@u25-beratung.example.org',
        inviteStatus: 'ACCEPTED',
        acceptedAt: '2026-08-09T09:00:00Z',
        provisioningStatus: 'PROVISIONING',
        createDate: '2026-08-05T10:00:00Z',
    }),
    counsellorInvite({
        firstName: 'Murat',
        lastName: 'Aydın',
        recipientEmail: 'murat.aydin@suchtberatung-mitte.example.org',
        inviteStatus: 'ACCEPTED',
        acceptedAt: '2026-08-02T10:00:00Z',
        provisioningStatus: 'COMPLETED',
        accessGateStatus: 'READY',
        createDate: '2026-07-29T10:00:00Z',
    }),
    counsellorInvite({
        firstName: 'Franz',
        lastName: 'Obermeier',
        recipientEmail: 'franz.obermeier@lebensberatung-passau.example.org',
        inviteStatus: 'EXPIRED',
        createDate: '2026-06-20T10:00:00Z',
    }),
];

const Wired = ({ invites, targetRole }: { invites: AccountInviteDTO[]; targetRole: 'TENANT_ADMIN' | 'COUNSELLOR' }) => {
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    return (
        <InviteProgressBoard
            invites={invites}
            loading={false}
            targetRole={targetRole}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            isRowSelectable={(invite) => invite.inviteStatus === 'DRAFT' || invite.inviteStatus === 'EMAIL_SENT'}
            onResend={() => {}}
            onCopyLink={() => {}}
            onRevoke={() => {}}
            onInviteCta={() => {}}
        />
    );
};

/** Träger tracking: nine invites covering every bucket, bead state and chip. */
export const TenantInvites: Story = {
    render: () => <Wired invites={TENANT_INVITES} targetRole="TENANT_ADMIN" />,
};

/** Berater tracking: the short three-phase track incl. a provisioning row. */
export const CounsellorInvites: Story = {
    render: () => <Wired invites={COUNSELLOR_INVITES} targetRole="COUNSELLOR" />,
};

/** Loading: the skeleton keeps the table silhouette while the list fetches. */
export const Loading: Story = {
    render: () => (
        <InviteProgressBoard
            invites={[]}
            loading
            targetRole="TENANT_ADMIN"
            selectedIds={[]}
            onSelectionChange={() => {}}
            isRowSelectable={() => false}
            onResend={() => {}}
            onCopyLink={() => {}}
            onRevoke={() => {}}
        />
    ),
};

/** Empty: friendly invitation to send the first invite (CTA focuses the composer). */
export const Empty: Story = {
    render: () => (
        <InviteProgressBoard
            invites={[]}
            loading={false}
            targetRole="TENANT_ADMIN"
            selectedIds={[]}
            onSelectionChange={() => {}}
            isRowSelectable={() => false}
            onResend={() => {}}
            onCopyLink={() => {}}
            onRevoke={() => {}}
            onInviteCta={() => {}}
        />
    ),
};

/** Phone 390: tiles go 2×2 and rows collapse into stacked cards with the mini stepper. */
export const Mobile: Story = {
    globals: { viewport: { value: 'phone', isRotated: false } },
    render: () => <Wired invites={TENANT_INVITES} targetRole="TENANT_ADMIN" />,
};

/* Oskar founds agency 900, Lena and Tom wait for it; Rita waits for 901, whose admin invite was revoked. */
const queueInvite = (overrides: Partial<AccountInviteDTO>): AccountInviteDTO =>
    tenantInvite({ targetRole: 'COUNSELLOR', tenantId: 40, expiresAt: null, ...overrides });

const QUEUE_INVITES: AccountInviteDTO[] = [
    queueInvite({
        targetRole: 'AGENCY_ADMIN',
        firstName: 'Oskar',
        lastName: 'Brandt',
        recipientEmail: 'oskar.brandt@example.org',
        agencyId: 900,
        agencyIdAllocationMode: 'MANUAL',
        alsoCounsellor: true,
        expiresAt: '2026-10-01T10:00:00Z',
    }),
    queueInvite({
        firstName: 'Lena',
        lastName: 'Vogt',
        recipientEmail: 'lena.vogt@example.org',
        agencyId: 900,
        inviteStatus: 'WAITING_FOR_UNIT',
        waitingForUnit: 'AGENCY',
        emailDeliveryStatus: null,
        topicPermission: 'NONE',
    }),
    queueInvite({
        firstName: 'Tom',
        lastName: 'Keller',
        recipientEmail: 'tom.keller@example.org',
        agencyId: 900,
        inviteStatus: 'WAITING_FOR_UNIT',
        waitingForUnit: 'AGENCY',
        emailDeliveryStatus: null,
        topicPermission: 'SELECT_EXISTING',
    }),
    queueInvite({
        firstName: 'Rita',
        lastName: 'Sommer',
        recipientEmail: 'rita.sommer@example.org',
        agencyId: 901,
        inviteStatus: 'WAITING_FOR_UNIT',
        waitingForUnit: 'AGENCY',
        queueProblem: 'NO_UNIT_ADMIN',
        emailDeliveryStatus: null,
        topicPermission: 'NONE',
    }),
    queueInvite({
        firstName: 'Anke',
        lastName: 'Roth',
        recipientEmail: 'anke.roth@example.org',
        agencyId: 12,
        inviteStatus: 'ACCEPTED',
        acceptedAt: '2026-09-20T10:00:00Z',
        topicPermission: 'NONE',
    }),
];

const QueueBoard = ({
    onTopicPermissionChange,
}: {
    onTopicPermissionChange?: (invite: AccountInviteDTO, value: TopicPermission) => void;
}) => {
    const [invites, setInvites] = useState(QUEUE_INVITES);
    return (
        <InviteProgressBoard
            invites={invites}
            loading={false}
            targetRole="COUNSELLOR"
            selectedIds={[]}
            onSelectionChange={() => {}}
            isRowSelectable={(invite) => invite.inviteStatus === 'DRAFT' || invite.inviteStatus === 'EMAIL_SENT'}
            onResend={() => {}}
            onCopyLink={() => {}}
            onRevoke={() => {}}
            onTopicPermissionChange={(invite, value) => {
                onTopicPermissionChange?.(invite, value);
                setInvites((current) =>
                    current.map((row) => (row.id === invite.id ? { ...row, topicPermission: value } : row)),
                );
            }}
        />
    );
};

const rowOf = (canvasElement: HTMLElement, email: string) =>
    within(within(canvasElement).getByText(email).closest('tr') as HTMLElement);

/** Waiting invites get a new first step; manual resend is disabled with a tooltip, revoke stays possible. */
export const QueueWaitingStep: Story = {
    args: { onTopicPermissionChange: fn() },
    render: (args) => <QueueBoard onTopicPermissionChange={args.onTopicPermissionChange} />,
    play: async ({ canvasElement }) => {
        const lena = rowOf(canvasElement, 'lena.vogt@example.org');
        await expect(
            lena.getAllByText(/Beratungsstelle noch nicht angelegt|Beratungsstelle not created yet/).length,
        ).toBeGreaterThan(0);
        await expect(lena.getByRole('button', { name: /Erinnerung erneut senden|resend/i })).toBeDisabled();
        await expect(lena.getByRole('button', { name: /Einladung widerrufen|revoke/i })).toBeEnabled();
    },
};

/** A waiting invite whose unit has no admin invite any more: problem badge „Keine BST-Admin". */
export const QueueProblemBadge: Story = {
    args: { onTopicPermissionChange: fn() },
    render: (args) => <QueueBoard onTopicPermissionChange={args.onTopicPermissionChange} />,
    play: async ({ canvasElement }) => {
        const rita = rowOf(canvasElement, 'rita.sommer@example.org');
        await expect(rita.getByText(/^(Keine BST-Admin|No agency admin)$/)).toBeInTheDocument();
        await expect(
            rowOf(canvasElement, 'tom.keller@example.org').queryByText(/^(Keine BST-Admin|No agency admin)$/),
        ).toBeNull();
    },
};

/** „Themen & Fachbereiche" per row — also for an accepted counsellor (the account follows). */
export const TopicPermissionInTable: Story = {
    args: { onTopicPermissionChange: fn() },
    render: (args) => <QueueBoard onTopicPermissionChange={args.onTopicPermissionChange} />,
    play: async ({ args, canvasElement }) => {
        const body = within(canvasElement.ownerDocument.body);
        const anke = rowOf(canvasElement, 'anke.roth@example.org');
        await userEvent.click(anke.getByRole('combobox', { name: /Themen für Anke Roth|Topics for Anke Roth/ }));
        await userEvent.click(await body.findByTitle(/Darf weitere Themen anlegen|may create/i));
        await waitFor(() => expect(args.onTopicPermissionChange).toHaveBeenCalledWith(expect.anything(), 'CREATE'));
    },
};

/** On a phone the topic select stacks into the card; its short label is all it says, so it must not be cut off. */
export const QueueMobile: Story = {
    globals: { viewport: { value: 'phone', isRotated: false } },
    args: { onTopicPermissionChange: fn() },
    render: (args) => <QueueBoard onTopicPermissionChange={args.onTopicPermissionChange} />,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const selects = await canvas.findAllByRole('combobox', { name: /Themen für|Topics for/ });
        await expect(selects.length).toBeGreaterThan(0);
        selects.forEach((select) => {
            const field = select.closest('.ant-select') as HTMLElement;
            const label = field.querySelector<HTMLElement>('.ant-select-selection-item');
            expect(label).not.toBeNull();
            const shown = label as HTMLElement;
            // Fully rendered: nothing clipped (scrollWidth fits) and the text is not cut short.
            expect(shown.scrollWidth).toBeLessThanOrEqual(shown.clientWidth + 1);
            expect(shown.textContent).toMatch(/^(Themen|Topics): /);
        });
    },
};
