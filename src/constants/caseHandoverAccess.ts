import { PermissionAction } from '../enums/PermissionAction';
import { Resource } from '../enums/Resource';
import { UserRole } from '../enums/UserRole';

type CanFn = (action: PermissionAction | PermissionAction[], resource: Resource) => boolean;
type HasRoleFn = (role: UserRole | UserRole[]) => boolean;

export const canReadCaseHandoverAdmin = (isSuperAdmin: boolean, hasRole: HasRoleFn, can: CanFn): boolean =>
    isSuperAdmin || (!hasRole(UserRole.RestrictedAgencyAdmin) && can(PermissionAction.Read, Resource.Consultant));

export const canEditCaseHandoverReasonPolicies = (isSuperAdmin: boolean, can: CanFn): boolean =>
    isSuperAdmin || can(PermissionAction.Update, Resource.Consultant);
