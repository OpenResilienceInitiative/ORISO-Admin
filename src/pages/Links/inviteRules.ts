import type { AccountInviteDTO, AccountInviteTargetRole } from '../../api/accountInvites/accountInvites';
import type { AllocationMode } from '../../api/idAllocation/idAllocation';
import type { IdFieldMode, IdValidationState } from '../../components/IdAllocationField';
import type { InviteRole, InviteViewerScope } from './inviteModel';

/** The Träger tab founds new Träger; the counsellor tab invites into units. */
export type InviteTab = 'tenant' | 'counsellor';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const isValidEmail = (email: string) => EMAIL_PATTERN.test(email.trim());

const ALL_ROLES: InviteRole[] = ['COUNSELLOR', 'AGENCY_ADMIN', 'TENANT_ADMIN'];

/** A higher unit invites a lower one; the backend enforces the same rule. */
export const invitableRoles = (viewer: InviteViewerScope, tab: InviteTab): InviteRole[] => {
    if (tab === 'tenant') return ['TENANT_ADMIN'];
    return viewer === 'agency' ? ['COUNSELLOR'] : ALL_ROLES;
};

// The server refuses agency-admin self-assignment: that row was never read.
export const SELF_ASSIGN_ROLES: InviteRole[] = ['COUNSELLOR'];

export interface InviteFields {
    agency: boolean;
    topics: boolean;
    alsoCounsellor: boolean;
}

export const fieldsForRole = (role: InviteRole, tab: InviteTab): InviteFields => {
    const agency = tab === 'counsellor' && role !== 'TENANT_ADMIN';
    return { agency, topics: agency && role === 'COUNSELLOR', alsoCounsellor: agency && role === 'AGENCY_ADMIN' };
};

export const allocationModeOf = (mode: IdFieldMode): AllocationMode => {
    if (mode === 'existing') return 'EXISTING';
    return mode === 'auto' ? 'AUTO' : 'MANUAL';
};

// A counsellor may only wait for a new agency whose number an open admin invite reserved; the server refuses the rest.
export const counsellorNeedsUnitAdmin = (
    role: InviteRole,
    agency: { mode: IdFieldMode; validation: IdValidationState },
): boolean =>
    role === 'COUNSELLOR' &&
    (agency.mode === 'auto' || (agency.mode === 'manual' && agency.validation === 'available'));

/** CSV rows go founding admins first, so rows that wait for a new unit find its admin invite. */
export const csvSendOrder = (role: InviteRole, target: 'NEW' | 'EXISTING'): number => {
    if (target === 'EXISTING') return 2;
    if (role === 'TENANT_ADMIN') return 0;
    return role === 'AGENCY_ADMIN' ? 1 : 2;
};

/** Only a DRAFT or a sent invite can still be sent or revoked. */
export const isBulkSelectable = (invite: AccountInviteDTO) =>
    invite.inviteStatus === 'DRAFT' || invite.inviteStatus === 'EMAIL_SENT';

const TAB_ROLES: ReadonlySet<AccountInviteTargetRole> = new Set(['TENANT_ADMIN', 'AGENCY_ADMIN', 'COUNSELLOR']);

/** The Träger tab lists the invites that found a Träger; everything joining a unit is on the counsellor tab. */
export const listedOnTab = (invite: AccountInviteDTO, tab: InviteTab, viewer: InviteViewerScope): boolean => {
    if (!TAB_ROLES.has(invite.targetRole)) return false;
    const foundsTenant = invite.targetRole === 'TENANT_ADMIN' && invite.tenantIdAllocationMode !== 'EXISTING';
    if (foundsTenant !== (tab === 'tenant')) return false;
    // The backend scopes an agency admin's list; they act on counsellor invites only.
    return viewer !== 'agency' || invite.targetRole === 'COUNSELLOR';
};

/** Why a role-chip entry is off; the chip's tooltip and menu say it in words. */
export type RoleLockReason =
    | 'notInvitable'
    | 'needsNewInvite'
    | 'accountExists'
    | 'accountPending'
    | 'alreadyHasRole'
    | 'inactive'
    | 'foundsTenant';

export interface RoleMenuEntry {
    /** `change` replaces the invited role; `add` gives an existing account one more. */
    action: 'change' | 'add';
    role: InviteRole;
    current: boolean;
    disabledReason?: RoleLockReason;
}

export interface RoleMenu {
    mode: 'change' | 'add' | 'locked';
    entries: RoleMenuEntry[];
    lockedReason?: RoleLockReason;
    /** Taking a role away is done in the users area, not here. */
    pointsToUsers: boolean;
}

/** Statuses of an invite that is still in play (not accepted, expired, revoked or replaced). */
export const OPEN_STATUSES: ReadonlySet<AccountInviteDTO['inviteStatus']> = new Set([
    'DRAFT',
    'EMAIL_SENT',
    'WAITING_FOR_UNIT',
]);

// The backend swaps only these two; a Träger-level role has its own placement and link (UserService#1260).
const SWAPPABLE_ROLES: ReadonlySet<InviteRole> = new Set(['COUNSELLOR', 'AGENCY_ADMIN']);

const lockAll = (entries: RoleMenuEntry[], reason: RoleLockReason): RoleMenu => ({
    mode: 'locked',
    lockedReason: reason,
    entries: entries.map((entry) => ({ ...entry, disabledReason: reason })),
    pointsToUsers: false,
});

/**
 * The role chip's menu (Frank, 25 Sept). Before acceptance Berater:in and BST-Admin swap within what
 * the viewer may invite; once the account exists only "+ auch BST-Admin" is left, and removal lives in
 * the users area. Locked entries stay in the menu, disabled with their reason.
 */
export const roleMenuFor = (
    invite: Pick<
        AccountInviteDTO,
        'targetRole' | 'inviteStatus' | 'tenantIdAllocationMode' | 'provisionedUserId' | 'accountRoles'
    >,
    viewer: InviteViewerScope,
    tab: InviteTab,
): RoleMenu => {
    const allowed = invitableRoles(viewer, tab);
    const tabRoles: InviteRole[] = tab === 'tenant' ? ['TENANT_ADMIN'] : ALL_ROLES;
    const current = invite.targetRole as InviteRole;
    const changeReason = (role: InviteRole): RoleLockReason | undefined => {
        if (role === current) return undefined;
        if (!allowed.includes(role)) return 'notInvitable';
        return SWAPPABLE_ROLES.has(role) && SWAPPABLE_ROLES.has(current) ? undefined : 'needsNewInvite';
    };
    const changeEntries = tabRoles.map<RoleMenuEntry>((role) => {
        const reason = changeReason(role);
        return { action: 'change', role, current: role === current, ...(reason ? { disabledReason: reason } : {}) };
    });

    if (invite.targetRole === 'TENANT_ADMIN' && invite.tenantIdAllocationMode !== 'EXISTING') {
        return lockAll(changeEntries, 'foundsTenant');
    }
    if (OPEN_STATUSES.has(invite.inviteStatus)) {
        return { mode: 'change', entries: changeEntries, pointsToUsers: false };
    }
    if (invite.inviteStatus !== 'ACCEPTED') return lockAll(changeEntries, 'inactive');

    let addReason: RoleLockReason | undefined;
    if (invite.targetRole === 'AGENCY_ADMIN' || invite.accountRoles?.includes('AGENCY_ADMIN'))
        addReason = 'alreadyHasRole';
    else if (!allowed.includes('AGENCY_ADMIN') || invite.targetRole !== 'COUNSELLOR') addReason = 'notInvitable';
    else if (!invite.provisionedUserId) addReason = 'accountPending';
    return {
        mode: 'add',
        entries: [
            {
                action: 'add',
                role: 'AGENCY_ADMIN',
                current: false,
                ...(addReason ? { disabledReason: addReason } : {}),
            },
            ...changeEntries.map((entry) => ({ ...entry, disabledReason: 'accountExists' as const })),
        ],
        pointsToUsers: true,
    };
};
