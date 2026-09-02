import { useAppConfigContext } from '../context/useAppConfig';
import { UserRole } from '../enums/UserRole';
import { useTenantData } from '../hooks/useTenantData.hook';
import { useUserRoles } from '../hooks/useUserRoles.hook';
import { UserPermission, UserPermissions } from '../types/UserPermission';

const rolesPriority: UserRole[] = [
    UserRole.RestrictedAgencyAdmin,
    UserRole.AgencyAdmin,
    UserRole.TopicAdmin,
    UserRole.UserAdmin,
    UserRole.SingleTenantAdmin,
    UserRole.TenantAdmin,
];

export const getEffectivePermissionRoles = (roles: UserRole[]): UserRole[] => {
    const filteredRoles = rolesPriority.filter((role) => roles.includes(role));

    return filteredRoles;
};

export const mergeUserPermissions = (...permissionSets: Array<UserPermissions | undefined>): UserPermissions =>
    permissionSets.reduce<Record<string, UserPermission>>((mergedPermissions, permissionSet) => {
        const nextPermissions = { ...mergedPermissions };

        Object.entries(permissionSet || {}).forEach(([resource, permissionsByAction]) => {
            const mergedResourcePermissions = {
                ...(nextPermissions[resource] || {}),
            } as UserPermission;

            Object.entries(permissionsByAction || {}).forEach(([action, isAllowed]) => {
                const actionKey = action as keyof UserPermission;
                mergedResourcePermissions[actionKey] =
                    Boolean(mergedResourcePermissions[actionKey]) || Boolean(isAllowed);
            });

            nextPermissions[resource] = mergedResourcePermissions;
        });

        return nextPermissions;
    }, {}) as UserPermissions;

// Roles that legitimately manage agency admins and therefore lift the restricted-agency-admin
// ceiling. A full agency admin outranks the restricted variant, and a tenant admin manages the
// agency admins inside their tenant by design. `user-admin` is deliberately NOT in this list:
// a restricted agency admin who also holds `user-admin` must not regain the AgencyAdminUser
// surface through the permission union (privilege escalation).
const AGENCY_ADMIN_CEILING_OVERRIDE_ROLES: UserRole[] = [UserRole.AgencyAdmin, UserRole.TenantAdmin];

/**
 * Enforces the restricted-agency-admin ceiling on the already-merged permissions.
 *
 * Permissions are merged as a boolean-OR union across all of a user's roles, so a secondary role
 * can re-grant surfaces that the `restricted-agency-admin` role explicitly withholds:
 * `user-admin`/`tenant-admin` re-grant `AgencyAdminUser`, and `single-tenant-admin` re-grants
 * `Statistic.read`. A restricted agency admin is a deliberately limited actor (no admin-user
 * management, no statistics), so when a user is a restricted agency admin and holds no genuinely
 * higher agency role (`agency-admin` full or `tenant-admin`), the ceiling is re-asserted:
 * `AgencyAdminUser` is forced fully denied and `Statistic.read` is forced `false`. A full agency
 * admin and a tenant admin outrank the restricted variant and keep their statistics. Every other
 * resource (Consultant, Topic, Tenant, …) is left untouched, so orthogonal roles keep their
 * legitimate permissions.
 */
export const enforceRestrictedAgencyAdminCeiling = (
    permissions: UserPermissions,
    roles: UserRole[],
): UserPermissions => {
    const isRestrictedAgencyAdmin = roles.includes(UserRole.RestrictedAgencyAdmin);
    const hasOverridingAgencyRole = AGENCY_ADMIN_CEILING_OVERRIDE_ROLES.some((role) => roles.includes(role));

    if (!isRestrictedAgencyAdmin || hasOverridingAgencyRole) {
        return permissions;
    }

    return {
        ...permissions,
        AgencyAdminUser: { read: false, create: false, update: false, delete: false },
        Statistic: { ...permissions.Statistic, read: false },
    };
};

export const useUserRolesToPermission = () => {
    const { roles, isSuperAdmin, isTenantScopedAdmin } = useUserRoles();
    const { data } = useTenantData();
    const { settings } = useAppConfigContext();

    // console.log('🔍 useUserRolesToPermission: roles:', roles);
    // console.log('🔍 useUserRolesToPermission: tenant data:', data);
    // console.log('🔍 useUserRolesToPermission: settings:', settings);

    const singleCanEditLegalText =
        !settings.multitenancyWithSingleDomainEnabled || settings.legalContentChangesBySingleTenantAdminsAllowed;
    const isMultiTenancyWithSingleDomain = settings.multitenancyWithSingleDomainEnabled;
    const isTopicsEnabled = data?.settings?.featureTopicsEnabled;

    // console.log('🔍 useUserRolesToPermission: isTopicsEnabled:', isTopicsEnabled);

    const permissions: Partial<Record<UserRole, UserPermissions>> = {
        [UserRole.RestrictedAgencyAdmin]: {
            Statistic: { read: false },
            Agency: { read: true, create: false, update: true, delete: false },
            AgencyAdminUser: { read: false, create: false, update: false, delete: false },
        },
        [UserRole.AgencyAdmin]: {
            Agency: { read: true, create: true, update: true, delete: true },
            Statistic: { read: true },
            // #609: the Fachbereich legal editors had NO permission check at all —
            // any admin who owned the agency could publish a data-protection policy
            // regardless of role or delegation. This mirrors the tenant-level rule
            // one rung down the ladder: reading is always allowed, changing follows
            // the same delegation switch. In a deployment without single-domain
            // multitenancy `singleCanEditLegalText` is true, so nothing changes there.
            LegalText: { read: true, update: singleCanEditLegalText },
        },
        [UserRole.TenantAdmin]: {
            // Tenant-scoped admins can manage tenant settings, but only super-admins may create/delete tenants.
            Tenant: { read: true, update: true, create: isSuperAdmin, delete: isSuperAdmin },
            Language: { update: true },
            LegalText: { read: true, update: true },
            Statistic: { read: true },
            // #902: tenant admins manage the tenant admins of their own tenant by design.
            // Commit 9fd581b73 regressed create/update/delete to isSuperAdmin and the
            // next-day hotfix 1665b33f4 restored only read — this restores the rest.
            // Backend tenant scoping is pending in UserService#1098; the Platform-Admins
            // SECTION (same resource) stays super-admin-only via canManageSectionActions.
            TenantAdminUser: {
                read: true,
                create: isTenantScopedAdmin || isSuperAdmin,
                update: isTenantScopedAdmin || isSuperAdmin,
                delete: isTenantScopedAdmin || isSuperAdmin,
            },
            // Tenant admins also manage the agency admins inside their tenant.
            AgencyAdminUser: { read: true, create: true, update: true, delete: true },
        },
        [UserRole.TopicAdmin]: {
            Topic: { read: isTopicsEnabled, create: isTopicsEnabled, update: isTopicsEnabled, delete: isTopicsEnabled },
        },
        [UserRole.SingleTenantAdmin]: {
            Tenant: { read: !isMultiTenancyWithSingleDomain, update: !isMultiTenancyWithSingleDomain },
            Language: { update: !settings.multitenancyWithSingleDomainEnabled },
            LegalText: {
                read: isMultiTenancyWithSingleDomain || singleCanEditLegalText,
                update: singleCanEditLegalText,
            },
            Statistic: { read: true },
        },
        [UserRole.UserAdmin]: {
            Consultant: { read: true, create: true, update: true, delete: true },
            AgencyAdminUser: { read: true, create: true, update: true, delete: true },
        },
    };

    const filteredRoles = getEffectivePermissionRoles(roles);
    // console.log('🔍 useUserRolesToPermission: filteredRoles:', filteredRoles);

    const mergedPermissions = mergeUserPermissions(...filteredRoles.map((role) => permissions[role]));
    const finalPermissions = enforceRestrictedAgencyAdminCeiling(mergedPermissions, filteredRoles);
    // console.log('🔍 useUserRolesToPermission: finalPermissions:', finalPermissions);

    return finalPermissions;
};
