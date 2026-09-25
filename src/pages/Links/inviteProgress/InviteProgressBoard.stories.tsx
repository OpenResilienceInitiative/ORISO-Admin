import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- valid `storybook` package-exports subpath; the eslint resolver predates exports maps
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import type { InviteRole, TopicPermission } from '../inviteModel';
import type { AccountInviteDTO } from '../../../api/accountInvites/accountInvites';
import { InviteProgressBoard } from './InviteProgressBoard';

/**
 * The Onboarding tracking board of the Links page: five phase tiles (the
 * only filter — Vorbereitet, Eingeladen, Konto angelegt, Fertig, Braucht
 * Aktion, each with its count and raw-status breakdown), the phase-progress
 * table and client-side pagination. Träger run the five-phase track (Eingeladen → Registriert →
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

const tileGroup = (canvasElement: HTMLElement) =>
    within(within(canvasElement).getByRole('group', { name: /Onboarding-Übersicht|Onboarding overview/ }));

const tableRows = (canvasElement: HTMLElement) =>
    within(canvasElement)
        .getAllByRole('row')
        .filter((row) => row.closest('tbody'));

/**
 * One row of five tiles is the board's only filter. „Braucht Aktion" (magenta) holds the expired,
 * revoked and replaced invites plus the bounced mail; a second press clears the filter.
 */
export const PhaseTilesFilter: Story = {
    globals: { viewport: { value: 'desktop', isRotated: false } },
    render: () => <Wired invites={TENANT_INVITES} targetRole="TENANT_ADMIN" />,
    play: async ({ canvasElement }) => {
        const tiles = tileGroup(canvasElement).getAllByRole('button');
        await expect(tiles.map((tile) => tile.querySelector('span')?.nextElementSibling?.textContent)).toEqual([
            'Vorbereitet',
            'Eingeladen',
            'Konto angelegt',
            'Fertig',
            'Braucht Aktion',
        ]);
        // One row on desktop.
        const tops = new Set(tiles.map((tile) => Math.round(tile.getBoundingClientRect().top)));
        await expect(tops.size).toBe(1);
        // No status chips any more — the tiles are the filter.
        await expect(within(canvasElement).queryByRole('checkbox', { name: /^(Angenommen|Accepted)$/ })).toBeNull();

        const needsAction = tiles[4];
        await expect(needsAction).toHaveTextContent(
            /^4Braucht Aktion1 Abgelaufen · 1 Widerrufen · 1 Ersetzt · 1 Versand fehlgeschlagen$/,
        );
        await userEvent.click(needsAction);
        await expect(needsAction).toHaveAttribute('aria-pressed', 'true');
        await waitFor(() => expect(tableRows(canvasElement)).toHaveLength(4));
        await expect(within(canvasElement).getByText('Claudia Winter')).toBeInTheDocument();
        await expect(within(canvasElement).queryByText('Maria Huber')).toBeNull();

        await userEvent.click(tiles[0]);
        await expect(needsAction).toHaveAttribute('aria-pressed', 'false');
        await waitFor(() => expect(tableRows(canvasElement)).toHaveLength(1));
        await expect(within(canvasElement).getByText('Ayşe Demir')).toBeInTheDocument();

        await userEvent.click(tiles[0]);
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

/** Phone 390: tiles in two columns („Braucht Aktion" alone on the last line), rows as stacked cards. */
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

/** A waiting invite whose unit has no admin invite any more: problem badge „Kein BST-Admin". */
export const QueueProblemBadge: Story = {
    args: { onTopicPermissionChange: fn() },
    render: (args) => <QueueBoard onTopicPermissionChange={args.onTopicPermissionChange} />,
    play: async ({ canvasElement }) => {
        const rita = rowOf(canvasElement, 'rita.sommer@example.org');
        await expect(rita.getByText(/^(Kein BST-Admin|No agency admin)$/)).toBeInTheDocument();
        await expect(
            rowOf(canvasElement, 'tom.keller@example.org').queryByText(/^(Kein BST-Admin|No agency admin)$/),
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
        viewerScope="tenant"
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
        await expect(items).toHaveLength(3);
        await expect(items[2]).toHaveAttribute('aria-disabled', 'true');
        await expect(items[2]).toHaveTextContent(/widerrufen und neu einladen|revoke and invite again/);
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
