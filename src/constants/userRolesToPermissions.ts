import { useAppConfigContext } from '../context/useAppConfig';
import { UserRole } from '../enums/UserRole';
import { useTenantData } from '../hooks/useTenantData.hook';
import { useUserRoles } from '../hooks/useUserRoles.hook';
import { UserPermission, UserPermissions } from '../types/UserPermission';

// A mixed-role account gets the UNION of its roles' permissions: mergeUserPermissions
// ORs each action across all roles, so a permission granted by ANY role is kept. This
// is order-independent, so a narrowing role like RestrictedAgencyAdmin can never
// silently downgrade a broader role (e.g. agency-admin + restricted-agency-admin keeps
// the agency create/delete grants). The order below is retained only for stable output.
const rolesPriority: UserRole[] = [
    UserRole.RestrictedAgencyAdmin,
    UserRole.AgencyAdmin,
    UserRole.TopicAdmin,
    UserRole.UserAdmin,
    UserRole.SingleTenantAdmin,
    UserRole.TenantAdmin,
];

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

export const useUserRolesToPermission = () => {
    const { roles, isSuperAdmin } = useUserRoles();
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
        },
        [UserRole.TenantAdmin]: {
            // Tenant-scoped admins can manage tenant settings, but only super-admins may create/delete tenants.
            Tenant: { read: true, update: true, create: isSuperAdmin, delete: isSuperAdmin },
            Language: { update: true },
            LegalText: { read: true, update: true },
            Statistic: { read: true },
            TenantAdminUser: {
                read: true,
                create: isSuperAdmin,
                update: isSuperAdmin,
                delete: isSuperAdmin,
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

    const filteredRoles = rolesPriority.filter((role) => roles.includes(role));
    // console.log('🔍 useUserRolesToPermission: filteredRoles:', filteredRoles);

    const finalPermissions = mergeUserPermissions(...filteredRoles.map((role) => permissions[role]));
    // console.log('🔍 useUserRolesToPermission: finalPermissions:', finalPermissions);

    return finalPermissions;
};
