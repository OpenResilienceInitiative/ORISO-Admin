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
