import { useState } from 'react';
import type { Decorator, Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- valid `storybook` package-exports subpath; the eslint resolver predates exports maps
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import type { InviteRole, TopicPermission } from '../inviteModel';
import type { AccountInviteDTO } from '../../../api/accountInvites/accountInvites';
import { IconButton } from '../../../components/IconButton';
import { InviteProgressBoard } from './InviteProgressBoard';

/**
 * The Onboarding tracking board of the Links page: one card whose sticky
 * toolbar holds the search slot, the compact pagination, the actions slot and
 * the filter chips (Alle, Vorbereitet, Eingeladen, Konto angelegt, Fertig,
 * Braucht Aktion — each with its count, the raw-status breakdown in the
 * tooltip), over the phase-progress table. Narrow boards reflow to five
 * columns instead of scrolling sideways. Träger run the five-phase track (Eingeladen → Registriert →
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

// What the server sends for each status (ORISO-UserService#1260); special rows override it.
const SERVER_PHASE: Record<AccountInviteDTO['inviteStatus'], NonNullable<AccountInviteDTO['progressPhase']>> = {
    WAITING_FOR_UNIT: 'PREPARED',
    DRAFT: 'PREPARED',
    EMAIL_SENT: 'INVITED',
    ACCEPTED: 'ACCOUNT_CREATED',
    EXPIRED: 'NEEDS_ACTION',
    REVOKED: 'CLOSED',
    SUPERSEDED: 'CLOSED',
};

let nextId = 0;
const tenantInvite = (overrides: Partial<AccountInviteDTO>): AccountInviteDTO => {
    nextId += 1;
    return {
        progressPhase: SERVER_PHASE[overrides.inviteStatus ?? 'EMAIL_SENT'],
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
        progressPhase: 'NEEDS_ACTION',
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
        progressPhase: 'DONE',
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

/** Träger tracking: nine invites covering every tile, bead state and status badge. */
export const TenantInvites: Story = {
    render: () => <Wired invites={TENANT_INVITES} targetRole="TENANT_ADMIN" />,
};

const chipGroup = (canvasElement: HTMLElement) =>
    within(within(canvasElement).getByRole('group', { name: /Onboarding-Übersicht|Onboarding overview/ }));

const tableRows = (canvasElement: HTMLElement) =>
    within(canvasElement)
        .getAllByRole('row')
        .filter((row) => row.closest('tbody'));

/**
 * One line of filter chips is the board's only filter (the export keeps its old name for stable story
 * ids). „Braucht Aktion" holds the expired, revoked and replaced invites plus the bounced mail; a
 * second press, or „Alle", clears the filter.
 */
export const PhaseTilesFilter: Story = {
    globals: { viewport: { value: 'desktop', isRotated: false } },
    render: () => <Wired invites={TENANT_INVITES} targetRole="TENANT_ADMIN" />,
    play: async ({ canvasElement }) => {
        const chips = chipGroup(canvasElement).getAllByRole('button');
        await expect(chips.map((chip) => chip.textContent?.replace(/ \d+$/, ''))).toEqual([
            'Alle',
            'Vorbereitet',
            'Eingeladen',
            'Konto angelegt',
            'Fertig',
            'Braucht Aktion',
        ]);
        await expect(chips[0]).toHaveTextContent(/^Alle 9$/);
        await expect(chips[5]).toHaveTextContent(/^Braucht Aktion 4$/);
        // One line on desktop.
        const tops = new Set(chips.map((chip) => Math.round(chip.getBoundingClientRect().top)));
        await expect(tops.size).toBe(1);
        // No status chips any more — the phase chips are the filter.
        await expect(within(canvasElement).queryByRole('checkbox', { name: /^(Angenommen|Accepted)$/ })).toBeNull();

        const [all, prepared, , , , needsAction] = chips;
        await expect(all).toHaveAttribute('aria-pressed', 'true');
        await expect(needsAction).toHaveAttribute(
            'title',
            '1 Abgelaufen · 1 Widerrufen · 1 Ersetzt · 1 Versand fehlgeschlagen',
        );
        await userEvent.click(needsAction);
        await expect(needsAction).toHaveAttribute('aria-pressed', 'true');
        await expect(all).toHaveAttribute('aria-pressed', 'false');
        await waitFor(() => expect(tableRows(canvasElement)).toHaveLength(4));
        await expect(within(canvasElement).getByText('Claudia Winter')).toBeInTheDocument();
        await expect(within(canvasElement).queryByText('Maria Huber')).toBeNull();

        await userEvent.click(prepared);
        await expect(needsAction).toHaveAttribute('aria-pressed', 'false');
        await waitFor(() => expect(tableRows(canvasElement)).toHaveLength(1));
        await expect(within(canvasElement).getByText('Ayşe Demir')).toBeInTheDocument();

        await userEvent.click(all);
        await waitFor(() => expect(tableRows(canvasElement)).toHaveLength(TENANT_INVITES.length));
    },
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

/** Empty: the table is pre-drawn with faint stand-in rows under the invitation to send the first invite (CTA focuses the composer). */
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
    play: async ({ canvasElement }) => {
        await expect(within(canvasElement).getByText(/Noch keine Einladungen|No invitations yet/)).toBeVisible();
        await expect(canvasElement.querySelectorAll('tbody tr[aria-hidden="true"]')).toHaveLength(5);
    },
};

/** Phone 390: chips wrap, rows as stacked cards. */
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
        progressPhase: 'NEEDS_ACTION',
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
    locked = false,
}: {
    onTopicPermissionChange?: (invite: AccountInviteDTO, value: TopicPermission) => void;
    /** The viewer may not change topic permissions: the board gets no change handler. */
    locked?: boolean;
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
            onTopicPermissionChange={
                locked
                    ? undefined
                    : (invite, value) => {
                          onTopicPermissionChange?.(invite, value);
                          setInvites((current) =>
                              current.map((row) => (row.id === invite.id ? { ...row, topicPermission: value } : row)),
                          );
                      }
            }
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

/** „Themen & Fachbereiche" per row, also for an accepted counsellor: a chip that opens the menu of levels. */
export const TopicPermissionInTable: Story = {
    args: { onTopicPermissionChange: fn() },
    render: (args) => <QueueBoard onTopicPermissionChange={args.onTopicPermissionChange} />,
    play: async ({ args, canvasElement }) => {
        const body = within(canvasElement.ownerDocument.body);
        const anke = rowOf(canvasElement, 'anke.roth@example.org');
        const chip = anke.getByRole('button', { name: /Themen für Anke Roth|Topics for Anke Roth/ });
        await expect(chip).toHaveTextContent(/^(Themen: Keine weiteren|Topics: No more)$/);
        await userEvent.click(chip);
        const menu = await body.findByRole('menu');
        // All three levels, each with its description; the current one carries the check.
        await expect(within(menu).getAllByRole('menuitem')).toHaveLength(3);
        // The menu opens with a slide-in that starts at opacity 0: wait for it.
        await waitFor(() =>
            expect(within(menu).getByText(/Nur die vorausgewählten Fachbereiche|preselected/)).toBeVisible(),
        );
        await userEvent.click(within(menu).getByText(/Darf weitere Themen anlegen|may create/i));
        await waitFor(() => expect(args.onTopicPermissionChange).toHaveBeenCalledWith(expect.anything(), 'CREATE'));
        await waitFor(() => expect(chip).toHaveTextContent(/^(Themen: Anlegen|Topics: Create)$/));
    },
};

/** Without the right to change it, the chip stays visible but disabled, and the tooltip says why. */
export const TopicPermissionLocked: Story = {
    render: () => <QueueBoard locked />,
    play: async ({ canvasElement }) => {
        const body = within(canvasElement.ownerDocument.body);
        const anke = rowOf(canvasElement, 'anke.roth@example.org');
        const chip = anke.getByRole('button', { name: /Themen für Anke Roth|Topics for Anke Roth/ });
        await expect(chip).toHaveAttribute('aria-disabled', 'true');
        await userEvent.click(chip);
        await expect(body.queryByRole('menu')).toBeNull();
        await userEvent.hover(chip);
        await expect(await body.findByRole('tooltip')).toHaveTextContent(/keine Berechtigung|not allowed/);
    },
};

// The topic chip shares the role chip's line and height, so a counsellor row is no taller; its label is never cut.
const expectTopicChipsInline = async (canvasElement: HTMLElement) => {
    const canvas = within(canvasElement);
    const chips = await canvas.findAllByRole('button', { name: /Themen für|Topics for/ });
    await expect(chips.length).toBeGreaterThan(0);
    chips.forEach((chip) => {
        const row = chip.closest('tr') as HTMLElement;
        const role = row.querySelector<HTMLElement>('[class*="roleChip"]') as HTMLElement;
        const chipBox = chip.getBoundingClientRect();
        const roleBox = role.getBoundingClientRect();
        expect(Math.round(chipBox.height)).toBe(Math.round(roleBox.height));
        expect(chip.textContent).toMatch(/^(Themen|Topics): (Keine weiteren|Auswählen|Anlegen|No more|Select|Create)$/);
        expect(chip.scrollWidth).toBeLessThanOrEqual(chip.clientWidth + 1);
    });
    // Same line as the role chip: the chip adds no height to the row.
    chips.forEach((chip) => {
        const role = (chip.closest('tr') as HTMLElement).querySelector<HTMLElement>(
            '[class*="roleChip"]',
        ) as HTMLElement;
        expect(Math.abs(chip.getBoundingClientRect().top - role.getBoundingClientRect().top)).toBeLessThanOrEqual(1);
    });
};

/** The same queue at 1440 px: the chip stays in the role chip's line. */
export const QueueDesktop: Story = {
    globals: { viewport: { value: 'desktop', isRotated: false } },
    args: { onTopicPermissionChange: fn() },
    render: (args) => <QueueBoard onTopicPermissionChange={args.onTopicPermissionChange} />,
    play: async ({ canvasElement }) => expectTopicChipsInline(canvasElement),
};

/** The same queue on a phone (390 px, narrower than the issue's 412 px): same chip, same line. */
export const QueueMobile: Story = {
    globals: { viewport: { value: 'phone', isRotated: false } },
    args: { onTopicPermissionChange: fn() },
    render: (args) => <QueueBoard onTopicPermissionChange={args.onTopicPermissionChange} />,
    play: async ({ canvasElement }) => expectTopicChipsInline(canvasElement),
};

/* Role chip and dated tracker (#1026, Frank 25 Sept; contract ORISO-UserService#1260). */
const ROLE_INVITES: AccountInviteDTO[] = [
    queueInvite({
        firstName: 'Lena',
        lastName: 'Vogt',
        recipientEmail: 'lena.vogt@example.org',
        agencyId: 12,
        topicPermission: 'NONE',
        sentAt: '2026-09-24T09:01:00Z',
    }),
    queueInvite({
        firstName: 'Anke',
        lastName: 'Roth',
        recipientEmail: 'anke.roth@example.org',
        agencyId: 12,
        inviteStatus: 'ACCEPTED',
        acceptedAt: '2026-09-25T12:30:12Z',
        provisionedUserId: 'c-anke',
        topicPermission: 'SELECT_EXISTING',
        // Waited for agency 12, which Oskar created on the 24th.
        unitCreatedAt: '2026-09-24T09:00:00Z',
        sentAt: '2026-09-24T09:01:00Z',
        accountCreatedAt: '2026-09-25T12:30:12Z',
    }),
];

const RoleBoard = ({
    onRoleChange,
    onRoleAdd,
}: {
    onRoleChange?: (invite: AccountInviteDTO, role: InviteRole) => void;
    onRoleAdd?: (invite: AccountInviteDTO, role: InviteRole) => void;
}) => (
    <InviteProgressBoard
        invites={ROLE_INVITES}
        loading={false}
        targetRole="COUNSELLOR"
        viewerScope="platform"
        selectedIds={[]}
        onSelectionChange={() => {}}
        isRowSelectable={() => false}
        onResend={() => {}}
        onCopyLink={() => {}}
        onRevoke={() => {}}
        onTopicPermissionChange={() => {}}
        onRoleChange={onRoleChange}
        onRoleAdd={onRoleAdd}
    />
);

const roleChipOf = (canvasElement: HTMLElement, name: string) =>
    within(canvasElement).getByRole('button', { name: new RegExp(`^(Rolle von|Role of) ${name}`) });

/**
 * The role chip opens a menu like the topic chip. Before acceptance Berater:in and BST-Admin swap
 * (Träger-Admin is disabled: it needs a new invite); after acceptance only „+ auch BST-Admin" is left,
 * and removal points to the users area. Hover explains what the role means and what can change.
 */
export const RoleChipMenu: Story = {
    globals: { viewport: { value: 'desktop', isRotated: false } },
    args: { onRoleChange: fn(), onRoleAdd: fn() },
    render: (args) => <RoleBoard onRoleChange={args.onRoleChange} onRoleAdd={args.onRoleAdd} />,
    play: async ({ canvasElement, args }) => {
        const body = within(canvasElement.ownerDocument.body);
        const lena = roleChipOf(canvasElement, 'Lena Vogt');

        await userEvent.hover(lena);
        const tooltip = await body.findByRole('tooltip');
        await expect(tooltip).toHaveTextContent(/Berät Ratsuchende|Counsels advice seekers/);
        await expect(tooltip).toHaveTextContent(/Noch nicht angenommen|Not accepted yet/);
        await userEvent.unhover(lena);

        await userEvent.click(lena);
        const menu = await body.findByRole('menu');
        const items = within(menu).getAllByRole('menuitem');
        // Träger-Admin invites live on the Träger tab: two entries here.
        await expect(items).toHaveLength(2);
        await userEvent.click(within(menu).getByText(/^(BST-Admin|Agency admin)$/));
        await expect(args.onRoleChange).toHaveBeenCalledWith(
            expect.objectContaining({ recipientEmail: 'lena.vogt@example.org' }),
            'AGENCY_ADMIN',
        );

        await userEvent.click(roleChipOf(canvasElement, 'Anke Roth'));
        const accountMenu = await body.findByRole('menu');
        await expect(within(accountMenu).getByRole('link')).toHaveAttribute('href', '/admin/users/consultants');
        await userEvent.click(within(accountMenu).getByText(/^(\+ auch BST-Admin|\+ also Agency admin)$/));
        await expect(args.onRoleAdd).toHaveBeenCalledWith(
            expect.objectContaining({ recipientEmail: 'anke.roth@example.org' }),
            'AGENCY_ADMIN',
        );
    },
};

/** Tracker: 4 dated steps when the invite waited for a new unit, otherwise 3; the full timestamp is in the tooltip. */
export const DatedTracker: Story = {
    globals: { viewport: { value: 'desktop', isRotated: false } },
    render: () => <RoleBoard onRoleChange={() => {}} onRoleAdd={() => {}} />,
    play: async ({ canvasElement }) => {
        const steps = (email: string) => within(rowOf(canvasElement, email).getByRole('list')).getAllByRole('listitem');
        await expect(steps('anke.roth@example.org')).toHaveLength(4);
        await expect(steps('lena.vogt@example.org')).toHaveLength(3);

        const [unit, invited, account] = steps('anke.roth@example.org');
        await expect(unit).toHaveTextContent(/24\.09\., 11:00$/);
        await expect(invited).toHaveTextContent(/24\.09\., 11:01$/);
        await expect(account).toHaveTextContent(/25\.09\., 14:30$/);

        const bead = account.querySelector<HTMLElement>('[tabindex="0"]') as HTMLElement;
        await userEvent.hover(bead);
        await expect(await within(canvasElement.ownerDocument.body).findByRole('tooltip')).toHaveTextContent(
            '25.09.2026, 14:30:12',
        );
    },
};

/*
 * The tiles count the whole tab on the server (ORISO-UserService#1260 `phaseCounts`), over every
 * page, so they do not shrink to the rows loaded here. Revoked and replaced sit under „Braucht Aktion".
 */
export const TileCountsOverTheWholeTab: Story = {
    globals: { viewport: { value: 'desktop', isRotated: false } },
    args: {
        targetRole: 'COUNSELLOR',
        viewerScope: 'tenant',
        invites: ROLE_INVITES,
        tileCounts: {
            prepared: { total: 24, details: { DRAFT: 21, WAITING_FOR_UNIT: 3 } },
            invited: { total: 12, details: { EMAIL_SENT: 12 } },
            accountCreated: { total: 4, details: { ACCEPTED: 4 } },
            done: { total: 31, details: { ACCEPTED: 31 } },
            needsAction: {
                total: 6,
                details: { EXPIRED: 2, REVOKED: 1, SUPERSEDED: 1, LINK_EXPIRED: 1, DELIVERY_FAILED: 1 },
            },
        },
    },
    play: async ({ canvasElement }) => {
        const chips = chipGroup(canvasElement).getAllByRole('button');
        await expect(chips[0]).toHaveTextContent(/^(Alle|All) 77$/);
        await expect(chips[1]).toHaveTextContent(/^(Vorbereitet|Prepared) 24$/);
        await expect(chips[4]).toHaveTextContent(/^(Fertig|Done) 31$/);
        await expect(chips[5]).toHaveTextContent(/^(Braucht Aktion|Needs action) 6$/);
        await expect(chips[5].getAttribute('title')).toMatch(
            /^2 (Abgelaufen|Expired) · 1 (Widerrufen|Revoked) · 1 (Ersetzt|Superseded) · 1 (Link abgelaufen|Link expired) · 1 (Versand fehlgeschlagen|Delivery failed)$/,
        );
    },
};

/* Träger tab: its own steps, each reached one dated like on the counsellor tab. */
const TRAEGER_DATED: AccountInviteDTO[] = [
    tenantInvite({
        firstName: 'Sabine',
        lastName: 'Keller',
        recipientEmail: 'sabine.keller@caritas-passau.example.org',
        tenantIdAllocationMode: 'MANUAL',
        inviteStatus: 'ACCEPTED',
        acceptedAt: '2026-09-25T12:30:12Z',
        accessGateStatus: 'READY',
        twoFactorStatus: 'ACTIVE',
        sentAt: '2026-09-24T09:01:00Z',
        accountCreatedAt: '2026-09-25T12:30:12Z',
        // Her registration created the Träger.
        unitCreatedAt: '2026-09-25T12:30:12Z',
        twoFactorDoneAt: '2026-09-25T12:41:05Z',
    }),
    tenantInvite({
        firstName: 'Jonas',
        lastName: 'Brandt',
        recipientEmail: 'jonas.brandt@caritas-passau.example.org',
        tenantIdAllocationMode: 'MANUAL',
        sentAt: '2026-09-24T09:02:00Z',
        // A co-founder: Sabine created the Träger before he registered.
        unitCreatedAt: '2026-09-25T12:30:12Z',
    }),
];

export const TraegerDatedTracker: Story = {
    globals: { viewport: { value: 'desktop', isRotated: false } },
    args: { targetRole: 'TENANT_ADMIN', invites: TRAEGER_DATED },
    play: async ({ canvasElement }) => {
        const steps = (email: string) => within(rowOf(canvasElement, email).getByRole('list')).getAllByRole('listitem');
        const founder = steps('sabine.keller@caritas-passau.example.org');
        await expect(founder).toHaveLength(6);
        await expect(founder[0]).toHaveTextContent(/(24\.09\., 11:01|09\/24, 11:01 AM)$/);
        await expect(founder[1]).toHaveTextContent(/(25\.09\., 14:30|09\/25, 02:30 PM)$/);
        await expect(founder[2]).toHaveTextContent(/(25\.09\., 14:30|09\/25, 02:30 PM)$/);
        await expect(founder[3]).toHaveTextContent(/(25\.09\., 14:41|09\/25, 02:41 PM)$/);

        // Sabine created the Träger before Jonas registered: the step comes right after the invite.
        const coFounder = steps('jonas.brandt@caritas-passau.example.org');
        await expect(coFounder[1]).toHaveTextContent(/(25\.09\., 14:30|09\/25, 02:30 PM)$/);
        await expect(coFounder[2]).not.toHaveTextContent(/\d\d:\d\d/);
    },
};

/* The chip reads the account's roles from the list, so „+ BST-Admin" survives a reload. */
export const RoleChipAfterReload: Story = {
    globals: { viewport: { value: 'desktop', isRotated: false } },
    args: {
        targetRole: 'COUNSELLOR',
        viewerScope: 'tenant',
        onRoleAdd: fn(),
        invites: [{ ...ROLE_INVITES[1], accountRoles: ['COUNSELLOR', 'AGENCY_ADMIN'] }],
    },
    play: async ({ canvasElement }) => {
        await expect(roleChipOf(canvasElement, 'Anke Roth')).toHaveTextContent(
            /^(Berater:in \+ BST-Admin|Counsellor \+ Agency admin)$/,
        );
    },
};

/* ── Card layouts (toolbar slots, wide vs. compact reflow, short list) ─────── */

const MoreIcon = () => (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden>
        <path
            d="M12 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4m0 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4m0 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4"
            fill="currentColor"
        />
    </svg>
);

/** Stand-ins for the page's search field and ⋮ menu, which live in AccountInvitesTab. */
const toolbarSlots = {
    toolbarSearch: (
        <input
            type="search"
            aria-label="Einladungen durchsuchen"
            placeholder="Name oder E-Mail suchen"
            style={{
                width: '100%',
                height: 40,
                boxSizing: 'border-box',
                padding: '0 16px',
                border: '1px solid #c4c7c8',
                borderRadius: 20,
                background: 'transparent',
                font: 'inherit',
            }}
        />
    ),
    toolbarActions: <IconButton icon={<MoreIcon />} ariaLabel="Weitere Aktionen" />,
};

const fixedWidth = (width: number): Decorator[] => [
    (Story) => (
        <div data-testid="frame" style={{ width }}>
            <Story />
        </div>
    ),
];

const expectNoSideScroll = async (canvasElement: HTMLElement) => {
    const frame = within(canvasElement).getByTestId('frame');
    const table = within(canvasElement).getByRole('table');
    await expect(Math.round(table.getBoundingClientRect().right)).toBeLessThanOrEqual(
        Math.round(frame.getBoundingClientRect().right),
    );
};

/** Wide counsellor board (1440): seven columns, the dated track on one line, toolbar slots filled. */
export const CounsellorWide: Story = {
    globals: { viewport: { value: 'desktop', isRotated: false } },
    args: { targetRole: 'COUNSELLOR', invites: [...COUNSELLOR_INVITES, ...ROLE_INVITES], ...toolbarSlots },
    play: async ({ canvasElement }) => {
        await waitFor(() => expect(within(canvasElement).getAllByRole('columnheader')).toHaveLength(7));
        await expect(within(canvasElement).getByRole('searchbox')).toBeInTheDocument();
        await expect(within(canvasElement).getByRole('button', { name: 'Weitere Aktionen' })).toBeInTheDocument();
    },
};

/** Counsellor board in an 846px column: five columns, dates and actions stacked, the track scrolls in one line. */
export const CounsellorCompact: Story = {
    args: { targetRole: 'COUNSELLOR', invites: [...COUNSELLOR_INVITES, ...ROLE_INVITES], ...toolbarSlots },
    decorators: fixedWidth(846),
    play: async ({ canvasElement }) => {
        await waitFor(() => expect(within(canvasElement).getAllByRole('columnheader')).toHaveLength(5));
        await expectNoSideScroll(canvasElement);
        const anke = rowOf(canvasElement, 'anke.roth@example.org');
        // All dated steps stay on one line inside the scrollable track.
        const steps = within(anke.getByRole('list')).getAllByRole('listitem');
        await expect(steps).toHaveLength(4);
        await expect(Math.round(steps[3].getBoundingClientRect().top)).toBe(
            Math.round(steps[2].getBoundingClientRect().top),
        );
        // A bead still explains its step on hover.
        await userEvent.hover(steps[3].querySelector<HTMLElement>('[tabindex="0"]') as HTMLElement);
        await expect(await within(canvasElement.ownerDocument.body).findByRole('tooltip')).toHaveTextContent(
            /(Wartet auf Abschluss: dieser Schritt ist gerade an der Reihe|Awaiting completion: .+)/,
        );
        await userEvent.unhover(steps[3]);
        // Actions sit under the status chip in the same cell.
        const revoke = anke.getByRole('button', { name: /Einladung widerrufen|revoke/i });
        const status = anke.getByText(/^(Angenommen|Accepted)$/);
        await expect(revoke.closest('td')).toBe(status.closest('td'));
        await expect(revoke.getBoundingClientRect().top).toBeGreaterThan(status.getBoundingClientRect().bottom - 1);
    },
};

/** Träger board in an 846px column: cards keep the long track in one scrollable line. */
export const TraegerCompact: Story = {
    args: { targetRole: 'TENANT_ADMIN', invites: [...TRAEGER_DATED, ...TENANT_INVITES.slice(0, 4)], ...toolbarSlots },
    decorators: fixedWidth(846),
    play: async ({ canvasElement }) => {
        await waitFor(() => expect(within(canvasElement).getAllByRole('columnheader')).toHaveLength(5));
        await expectNoSideScroll(canvasElement);
        const steps = within(
            rowOf(canvasElement, 'sabine.keller@caritas-passau.example.org').getByRole('list'),
        ).getAllByRole('listitem');
        await expect(steps).toHaveLength(6);
        const tops = steps.map((step) => Math.round(step.getBoundingClientRect().top));
        await expect(new Set(tops).size).toBe(1);
    },
};

/** Two invites: a hint row says where the next ones appear, then stand-in rows fade out. */
export const ShortListHint: Story = {
    globals: { viewport: { value: 'desktop', isRotated: false } },
    args: { targetRole: 'COUNSELLOR', invites: ROLE_INVITES, ...toolbarSlots },
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).getByText(
                /Hier erscheinen die nächsten Einladungen|Your next invitations will appear here/,
            ),
        ).toBeVisible();
        const standIns = Array.from(canvasElement.querySelectorAll<HTMLElement>('tbody tr[aria-hidden="true"]'));
        await expect(standIns.map((row) => row.style.opacity)).toEqual(['1', '0.75', '0.5']);
    },
};

/** A narrow board uses cards even inside a desktop viewport; dates scroll locally. */
export const NarrowDatedTracker: Story = {
    globals: { viewport: { value: 'desktop', isRotated: false } },
    render: () => (
        <div style={{ width: 320, maxWidth: '100%' }}>
            <RoleBoard />
        </div>
    ),
    play: async ({ canvasElement }) => {
        const table = within(canvasElement).getByRole('table');
        await waitFor(() => expect(getComputedStyle(table).display).toBe('block'));
        const tracks = table.querySelectorAll('ol');
        tracks.forEach((track) => {
            expect(track.clientWidth).toBeLessThanOrEqual(table.clientWidth);
            expect(getComputedStyle(track).overflowX).toBe('auto');
        });
        expect(canvasElement.scrollWidth).toBeLessThanOrEqual(canvasElement.clientWidth);
    },
};

/** Seven tenant milestones stay inside a phone card rather than widening the page. */
export const NarrowTenantTimeline: Story = {
    globals: { viewport: { value: 'desktop', isRotated: false } },
    render: () => (
        <div style={{ width: 320, maxWidth: '100%' }}>
            <Wired
                invites={TENANT_INVITES.map((invite) => ({ ...invite, sentAt: '2026-09-24T09:01:00Z' }))}
                targetRole="TENANT_ADMIN"
            />
        </div>
    ),
    play: NarrowDatedTracker.play,
};
