import merge from 'lodash.merge';
import { useAppConfigContext } from '../context/useAppConfig';
import { UserRole } from '../enums/UserRole';
import { useTenantData } from '../hooks/useTenantData.hook';
import { useUserRoles } from '../hooks/useUserRoles.hook';
import { UserPermissions } from '../types/UserPermission';

const rolesPriority: UserRole[] = [
    UserRole.AgencyAdmin,
    UserRole.TopicAdmin,
    UserRole.UserAdmin,
    UserRole.SingleTenantAdmin,
    UserRole.RestrictedAgencyAdmin,
    UserRole.TenantAdmin,
];

export const useUserRolesToPermission = () => {
    const { roles } = useUserRoles();
    const { data } = useTenantData();
    const { settings } = useAppConfigContext();

    console.log('🔍 useUserRolesToPermission: roles:', roles);
    console.log('🔍 useUserRolesToPermission: tenant data:', data);
    console.log('🔍 useUserRolesToPermission: settings:', settings);

    const singleCanEditLegalText =
        !settings.multitenancyWithSingleDomainEnabled || settings.legalContentChangesBySingleTenantAdminsAllowed;
    const isMultiTenancyWithSingleDomain = settings.multitenancyWithSingleDomainEnabled;
    const isTopicsEnabled = data?.settings?.featureTopicsEnabled;
    const isStatisticsEnabled = data?.settings?.featureStatisticsEnabled;

    console.log('🔍 useUserRolesToPermission: isTopicsEnabled:', isTopicsEnabled);
    console.log('🔍 useUserRolesToPermission: isStatisticsEnabled:', isStatisticsEnabled);

    const permissions: Record<Partial<UserRole>, UserPermissions> = {
        [UserRole.RestrictedAgencyAdmin]: {
            Statistic: { read: false },
            Agency: { read: true, create: false, update: true, delete: false },
            AgencyAdminUser: { read: false, create: false, update: false, delete: false },
        },
        [UserRole.AgencyAdmin]: {
            Agency: { read: true, create: true, update: true, delete: true },
        },
        [UserRole.TenantAdmin]: {
            Tenant: { read: true, update: true, create: true, delete: true },
            Language: { update: true },
            LegalText: { read: true, update: true },
            Statistic: { read: isStatisticsEnabled },
            TenantAdminUser: { read: true, create: true, update: true, delete: true },
        },
        [UserRole.TopicAdmin]: {
            Topic: { read: isTopicsEnabled, create: isTopicsEnabled, update: isTopicsEnabled, delete: isTopicsEnabled },
        },
        [UserRole.SingleTenantAdmin]: {
            Tenant: { read: !isMultiTenancyWithSingleDomain, update: !isMultiTenancyWithSingleDomain },
            Language: { update: !settings.multitenancyWithSingleDomainEnabled },
            LegalText: {
                read: singleCanEditLegalText,
                update: singleCanEditLegalText,
            },
            Statistic: { read: isStatisticsEnabled },
        },
        [UserRole.UserAdmin]: {
            Consultant: { read: true, create: true, update: true, delete: true },
            AgencyAdminUser: { read: true, create: true, update: true, delete: true },
        },
    };

    const filteredRoles = rolesPriority.filter((role) => roles.includes(role));
    console.log('🔍 useUserRolesToPermission: filteredRoles:', filteredRoles);

    const finalPermissions = filteredRoles.reduce(
        (current, role) => merge(current, permissions[role] || {}),
        {} as UserPermissions,
    );
    console.log('🔍 useUserRolesToPermission: finalPermissions:', finalPermissions);

    return finalPermissions;
};
