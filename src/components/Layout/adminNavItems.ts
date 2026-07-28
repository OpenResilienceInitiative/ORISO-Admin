import routePathNames from '../../appConfig';
import {
    canReadCaseHandoverAdmin,
    canSeeSupervisorLogs,
    type CanFn,
    type HasRoleFn,
} from '../../constants/caseHandoverAccess';
import { PermissionAction } from '../../enums/PermissionAction';
import { Resource } from '../../enums/Resource';
import { UserRole } from '../../enums/UserRole';
import { AdminSidebarNavItem } from './AdminSidebar';

/** Resolved sidebar labels. Kept as plain strings so this module stays free of i18n/React. */
export interface AdminNavLabels {
    account: string;
    activityLogs: string;
    agency: string;
    links: string;
    logs: string;
    settings: string;
    statistics: string;
    tenants: string;
    users: string;
}

export interface AdminNavContext {
    isSuperAdmin: boolean;
    hasRole: HasRoleFn;
    can: CanFn;
    labels: AdminNavLabels;
    /** Pre-resolved default settings route (depends on role + release toggles). */
    settingsPath: string;
}

/**
 * Landing section of the "Users" nav entry: the first section the user may actually read.
 */
export const resolveUsersPage = (can: CanFn): string => {
    if (can(PermissionAction.Read, Resource.TenantAdminUser)) {
        return routePathNames.tenantAdmins;
    }
    if (can(PermissionAction.Read, Resource.AgencyAdminUser)) {
        return routePathNames.agencyAdmins;
    }
    if (can(PermissionAction.Read, Resource.Consultant)) {
        return routePathNames.consultants;
    }
    return routePathNames.userProfile;
};

/**
 * Builds the upper sidebar nav items for the current user.
 *
 * Pure on purpose: all permission/role/feature input arrives via {@link AdminNavContext}, so the
 * visible navigation can be asserted per role without rendering the whole protected layout. Two
 * nav entries used to share the same "Logs" label, which produced a duplicate-looking menu for
 * every non-super-admin with `Read Consultant` (see ORISO-Admin#84) — `adminNavItems.test.ts`
 * guards against that class of bug.
 */
export const buildAdminNavItems = ({
    isSuperAdmin,
    hasRole,
    can,
    labels,
    settingsPath,
}: AdminNavContext): AdminSidebarNavItem[] => {
    const items: AdminSidebarNavItem[] = [];

    const canSeeSettingsMenu =
        can(PermissionAction.Read, Resource.Tenant) || can(PermissionAction.Read, Resource.LegalText);
    const canSeeCounsellorLogs = canSeeSupervisorLogs(isSuperAdmin, hasRole, can);
    const canSeeInactiveAuditLogs = isSuperAdmin && can(PermissionAction.Update, Resource.Tenant);
    const canSeeActivityLogs = canReadCaseHandoverAdmin(isSuperAdmin, hasRole, can) || canSeeInactiveAuditLogs;

    if (canSeeSettingsMenu) {
        items.push({
            key: 'theme',
            to: settingsPath,
            label: labels.settings,
            iconPath: routePathNames.themeSettings,
            activeMatch: { paths: [routePathNames.themeSettings], mode: 'includes' },
        });
    }
    if (isSuperAdmin && can(PermissionAction.Create, Resource.Tenant)) {
        items.push({
            key: 'tenants',
            to: routePathNames.tenants,
            label: labels.tenants,
            iconPath: routePathNames.tenants,
            activeMatch: { paths: [routePathNames.tenants], mode: 'includes' },
        });
    }
    if (
        can(PermissionAction.Read, Resource.Agency) &&
        (hasRole(UserRole.AgencyAdmin) || !hasRole(UserRole.RestrictedAgencyAdmin))
    ) {
        items.push({
            key: 'agency',
            to: routePathNames.agency,
            label: labels.agency,
            iconPath: routePathNames.agency,
            activeMatch: { paths: [routePathNames.agency], mode: 'includes' },
        });
    }
    if (
        can(PermissionAction.Read, Resource.Consultant) ||
        can(PermissionAction.Read, Resource.AgencyAdminUser) ||
        can(PermissionAction.Read, Resource.TenantAdminUser)
    ) {
        items.push({
            key: 'counselors',
            to: resolveUsersPage(can),
            label: labels.users,
            iconPath: routePathNames.users,
            activeMatch: { paths: [routePathNames.users], mode: 'includes' },
        });
    }
    if (can(PermissionAction.Read, Resource.Statistic)) {
        items.push({
            key: 'statistics',
            to: routePathNames.statistic,
            label: labels.statistics,
            iconPath: routePathNames.statistic,
        });
    }
    if (
        can(PermissionAction.Read, Resource.Agency) ||
        can(PermissionAction.Read, Resource.AgencyAdminUser) ||
        hasRole(UserRole.RestrictedAgencyAdmin)
    ) {
        items.push({
            key: 'links',
            to: routePathNames.links,
            label: labels.links,
            iconPath: routePathNames.links,
            activeMatch: { paths: [`${routePathNames.links}/`], mode: 'startsWith' },
        });
    }
    if (canSeeCounsellorLogs) {
        items.push({
            key: 'logs',
            to: routePathNames.logs,
            label: labels.logs,
            iconPath: routePathNames.logs,
            end: true,
        });
    }

    // Case-handover + inactive-account audit are unified into a single entry that opens a tabbed
    // page (Inactive default, then Case handover). It must NOT reuse the supervisor-logs label:
    // both entries are visible at the same time for a tenant admin who also holds `user-admin`.
    if (canSeeActivityLogs) {
        items.push({
            key: 'activity-logs',
            to: canSeeInactiveAuditLogs ? routePathNames.inactiveAccountAuditLogs : routePathNames.caseHandoverLogs,
            label: canSeeCounsellorLogs ? labels.activityLogs : labels.logs,
            iconPath: routePathNames.inactiveAccountAuditLogs,
            activeMatch: {
                paths: [routePathNames.inactiveAccountAuditLogs, routePathNames.caseHandoverLogs],
                mode: 'startsWith',
            },
        });
    }

    return items;
};
