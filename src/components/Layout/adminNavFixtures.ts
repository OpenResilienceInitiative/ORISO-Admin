import { PermissionAction } from '../../enums/PermissionAction';
import { Resource } from '../../enums/Resource';
import { UserRole } from '../../enums/UserRole';

/**
 * Shared `can` / `hasRole` stubs for everything that exercises {@link buildAdminNavItems}
 * (unit test and Storybook story). Keeping one implementation means a story cannot keep
 * "looking right" while the test stub drifts to different predicate semantics.
 */

/** A whole resource, or a single action on it. */
export type PermissionGrant = Resource | { action: PermissionAction; resource: Resource };

const matches = (grant: PermissionGrant, action: PermissionAction, resource: Resource) =>
    typeof grant === 'object' ? grant.action === action && grant.resource === resource : grant === resource;

/**
 * `can` stub. A bare `Resource` grants every action on it; `{ action, resource }` grants exactly
 * that pair, so action-sensitive branches (e.g. `Create Tenant` vs `Update Tenant`) can be
 * expressed. An array of actions is allowed when any of them is granted, matching
 * `useUserPermissions`.
 */
export const canFor =
    (...grants: PermissionGrant[]) =>
    (action: PermissionAction | PermissionAction[], resource: Resource): boolean =>
        (Array.isArray(action) ? action : [action]).some((candidate) =>
            grants.some((grant) => matches(grant, candidate, resource)),
        );

/** `hasRole` stub for the given roles. */
export const hasRoleFor =
    (...roles: UserRole[]) =>
    (role: UserRole | UserRole[]): boolean =>
        (Array.isArray(role) ? role : [role]).some((candidate) => roles.includes(candidate));
