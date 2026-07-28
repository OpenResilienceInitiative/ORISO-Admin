import { describe, expect, it } from 'vitest';
import { buildAdminNavItems, type AdminNavLabels } from './adminNavItems';
import { canFor, hasRoleFor } from './adminNavFixtures';
import routePathNames from '../../appConfig';
import { PermissionAction } from '../../enums/PermissionAction';
import { Resource } from '../../enums/Resource';
import { UserRole } from '../../enums/UserRole';

const labels: AdminNavLabels = {
    account: 'Account',
    activityLogs: 'Activity logs',
    agency: 'Counseling center',
    links: 'Links',
    logs: 'Logs',
    settings: 'Settings',
    statistics: 'Statistics',
    tenants: 'Tenants',
    users: 'Users',
};

const build = (context: Parameters<typeof buildAdminNavItems>[0]) => buildAdminNavItems(context);

describe('buildAdminNavItems', () => {
    it('never renders two nav entries with the same label', () => {
        // A tenant admin who also holds `user-admin` — the role mix the duplicate "Logs"
        // menu was reported with (ORISO-Admin#84).
        const items = build({
            isSuperAdmin: false,
            hasRole: hasRoleFor(UserRole.TenantAdmin, UserRole.UserAdmin),
            can: canFor(Resource.Tenant, Resource.LegalText, Resource.Consultant, Resource.AgencyAdminUser),
            labels,
            settingsPath: '/admin/theme-settings/general',
        });

        const renderedLabels = items.map((item) => item.label);
        expect(new Set(renderedLabels).size, `duplicate labels in ${renderedLabels.join(', ')}`).toBe(
            renderedLabels.length,
        );
    });

    it('gives the supervisor logs and the activity logs distinct labels when both are visible', () => {
        const items = build({
            isSuperAdmin: false,
            hasRole: hasRoleFor(UserRole.TenantAdmin, UserRole.UserAdmin),
            can: canFor(Resource.Consultant),
            labels,
            settingsPath: '/admin/theme-settings/general',
        });

        expect(items.find((item) => item.key === 'logs')?.label).toBe(labels.logs);
        expect(items.find((item) => item.key === 'activity-logs')?.label).toBe(labels.activityLogs);
        expect(items.find((item) => item.key === 'activity-logs')?.to).toBe(routePathNames.caseHandoverLogs);
    });

    it('keeps the single "Logs" entry for a super admin', () => {
        const items = build({
            isSuperAdmin: true,
            hasRole: hasRoleFor(UserRole.TenantAdmin),
            can: canFor(Resource.Tenant, Resource.LegalText, Resource.Consultant),
            labels,
            settingsPath: '/admin/theme-settings/global-config',
        });

        const logEntries = items.filter((item) => item.label === labels.logs);
        expect(logEntries).toHaveLength(1);
        expect(logEntries[0].key).toBe('activity-logs');
        expect(logEntries[0].to).toBe(routePathNames.inactiveAccountAuditLogs);
    });

    it('shows no log entry for a restricted agency admin', () => {
        const items = build({
            isSuperAdmin: false,
            hasRole: hasRoleFor(UserRole.RestrictedAgencyAdmin),
            can: canFor(Resource.Agency),
            labels,
            settingsPath: '/admin/theme-settings/legal',
        });

        expect(items.some((item) => item.key === 'logs' || item.key === 'activity-logs')).toBe(false);
    });

    it('lands the users entry on the first readable section', () => {
        const tenantAdmin = build({
            isSuperAdmin: false,
            hasRole: hasRoleFor(UserRole.TenantAdmin),
            can: canFor(Resource.TenantAdminUser),
            labels,
            settingsPath: '/admin/theme-settings/general',
        });
        expect(tenantAdmin.find((item) => item.key === 'counselors')?.to).toBe(routePathNames.tenantAdmins);

        const userAdmin = build({
            isSuperAdmin: false,
            hasRole: hasRoleFor(UserRole.UserAdmin),
            can: canFor(Resource.Consultant),
            labels,
            settingsPath: '/admin/theme-settings/general',
        });
        expect(userAdmin.find((item) => item.key === 'counselors')?.to).toBe(routePathNames.consultants);

        const agencyAdmin = build({
            isSuperAdmin: false,
            hasRole: hasRoleFor(UserRole.AgencyAdmin),
            can: canFor(Resource.AgencyAdminUser),
            labels,
            settingsPath: '/admin/theme-settings/general',
        });
        expect(agencyAdmin.find((item) => item.key === 'counselors')?.to).toBe(routePathNames.agencyAdmins);
    });

    it('routes a super admin without Update Tenant to the case-handover logs', () => {
        // `Update Tenant` is what unlocks the inactive-account audit; without it the unified
        // entry must fall back to the case-handover logs instead of a dead route.
        const items = build({
            isSuperAdmin: true,
            hasRole: hasRoleFor(UserRole.TenantAdmin),
            can: canFor(
                { action: PermissionAction.Read, resource: Resource.Tenant },
                { action: PermissionAction.Read, resource: Resource.Consultant },
            ),
            labels,
            settingsPath: '/admin/theme-settings/legal',
        });

        const activityLogs = items.find((item) => item.key === 'activity-logs');
        expect(activityLogs?.to).toBe(routePathNames.caseHandoverLogs);
        expect(items.some((item) => item.key === 'tenants')).toBe(false);
    });
});
