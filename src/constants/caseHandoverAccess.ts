import { PermissionAction } from '../enums/PermissionAction';
import { Resource } from '../enums/Resource';
import { UserRole } from '../enums/UserRole';

/** Shared predicate signatures for admin access checks (permissions + roles). */
export type CanFn = (action: PermissionAction | PermissionAction[], resource: Resource) => boolean;
export type HasRoleFn = (role: UserRole | UserRole[]) => boolean;

// Beratungsstellen-Admins (`restricted-agency-admin`, always paired with `user-admin`) are not
// excluded here: they administer consultants, so they get the same log views every other admin
// gets (ORISO-Admin#84). The UserService scopes both log queries to the agencies the admin is
// actually assigned to, so widening the menu does not widen the data.
export const canSeeSupervisorLogs = (isSuperAdmin: boolean, can: CanFn): boolean =>
    !isSuperAdmin && can(PermissionAction.Read, Resource.Consultant);

export const canReadCaseHandoverAdmin = (isSuperAdmin: boolean, can: CanFn): boolean =>
    isSuperAdmin || can(PermissionAction.Read, Resource.Consultant);

// The handover rules are Träger settings (FE#1725): writing them needs Träger write access.
// A BST admin (restricted-agency-admin + user-admin) has none and sees them read-only.
export const canEditCaseHandoverReasonPolicies = (isSuperAdmin: boolean, can: CanFn): boolean =>
    isSuperAdmin || can(PermissionAction.Update, Resource.Tenant);

// The deletion log shows who deleted which tenant, agency, admin or counsellor: platform admins
// only, mirroring the UserService (403 for every tenant-scoped role) and the inactive-account audit.
export const canSeeDeletionAuditLogsFor = (isSuperAdmin: boolean, can: CanFn): boolean =>
    isSuperAdmin && can(PermissionAction.Update, Resource.Tenant);
