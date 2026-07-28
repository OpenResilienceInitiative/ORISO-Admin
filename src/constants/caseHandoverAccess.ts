import { PermissionAction } from '../enums/PermissionAction';
import { Resource } from '../enums/Resource';
import { UserRole } from '../enums/UserRole';

/** Shared predicate signatures for admin access checks (permissions + roles). */
export type CanFn = (action: PermissionAction | PermissionAction[], resource: Resource) => boolean;
export type HasRoleFn = (role: UserRole | UserRole[]) => boolean;

export const canSeeSupervisorLogs = (isSuperAdmin: boolean, hasRole: HasRoleFn, can: CanFn): boolean =>
    !isSuperAdmin && !hasRole(UserRole.RestrictedAgencyAdmin) && can(PermissionAction.Read, Resource.Consultant);

export const canReadCaseHandoverAdmin = (isSuperAdmin: boolean, hasRole: HasRoleFn, can: CanFn): boolean =>
    isSuperAdmin || (!hasRole(UserRole.RestrictedAgencyAdmin) && can(PermissionAction.Read, Resource.Consultant));

export const canEditCaseHandoverReasonPolicies = (isSuperAdmin: boolean, can: CanFn): boolean =>
    isSuperAdmin || can(PermissionAction.Update, Resource.Consultant);
