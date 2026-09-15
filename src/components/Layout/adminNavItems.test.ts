import { describe, expect, it } from 'vitest';
import { buildAdminNavItems, resolveLogsPage, type AdminNavLabels } from './adminNavItems';
import { canFor, hasRoleFor } from './adminNavFixtures';
import routePathNames from '../../appConfig';
import { PermissionAction } from '../../enums/PermissionAction';
import { Resource } from '../../enums/Resource';
import { UserRole } from '../../enums/UserRole';

const labels: AdminNavLabels = {
    account: 'Account',
    agency: 'Agencies',
    links: 'Links',
    logs: 'Logs',
    settings: 'Settings',
    statistics: 'Statistics',
    tenants: 'Tenants',
    users: 'Users',
};

const build = (context: Parameters<typeof buildAdminNavItems>[0]) => buildAdminNavItems(context);

// Keyed, not labelled: the entry must stay findable when the display text is translated.
const logEntries = (items: ReturnType<typeof build>) => items.filter((item) => item.key === 'logs');

describe('resolveLogsPage', () => {
    it('prefers the supervision tab, then case handover, then the inactive-account audit', () => {
        expect(resolveLogsPage(true, true, true)).toBe(routePathNames.logs);
        expect(resolveLogsPage(false, true, true)).toBe(routePathNames.caseHandoverLogs);
        expect(resolveLogsPage(false, false, true)).toBe(routePathNames.inactiveAccountAuditLogs);
    });

    it('returns null when the admin may read no log view', () => {
        expect(resolveLogsPage(false, false, false)).toBeNull();
    });
});

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

    it.each([
        [
            'platform admin',
            {
                isSuperAdmin: true,
                hasRole: hasRoleFor(UserRole.TenantAdmin),
                can: canFor(Resource.Tenant, Resource.LegalText, Resource.Consultant),
                settingsPath: '/admin/theme-settings/global-config',
            },
            routePathNames.caseHandoverLogs,
        ],
        [
            'Träger admin with user-admin',
            {
                isSuperAdmin: false,
                hasRole: hasRoleFor(UserRole.TenantAdmin, UserRole.UserAdmin),
                can: canFor(Resource.Tenant, Resource.Consultant),
                settingsPath: '/admin/theme-settings/general',
            },
            routePathNames.logs,
        ],
        [
            'Beratungsstellen-Admin (restricted-agency-admin + user-admin)',
            {
                isSuperAdmin: false,
                hasRole: hasRoleFor(UserRole.RestrictedAgencyAdmin, UserRole.UserAdmin),
                can: canFor(Resource.Agency, Resource.Consultant),
                settingsPath: '/admin/theme-settings/legal',
            },
            routePathNames.logs,
        ],
    ])('gives the %s exactly one "Logs" entry', (_role, context, expectedLanding) => {
        const items = build({ ...context, labels });

        expect(logEntries(items)).toHaveLength(1);
        expect(logEntries(items)[0].label).toBe(labels.logs);
        expect(logEntries(items)[0].to).toBe(expectedLanding);
    });

    it('keeps the "Logs" entry highlighted across every log sub-route', () => {
        const items = build({
            isSuperAdmin: true,
            hasRole: hasRoleFor(UserRole.TenantAdmin),
            can: canFor(Resource.Tenant, Resource.Consultant),
            labels,
            settingsPath: '/admin/theme-settings/global-config',
        });

        const logs = items.find((item) => item.key === 'logs');
        expect(logs?.activeMatch).toEqual({ paths: [routePathNames.logs], mode: 'startsWith' });
        expect(routePathNames.caseHandoverLogs.startsWith(routePathNames.logs)).toBe(true);
        expect(routePathNames.inactiveAccountAuditLogs.startsWith(routePathNames.logs)).toBe(true);
    });

    it('shows the Beratungsstellen entry to a Beratungsstellen-Admin (restricted-agency-admin + user-admin)', () => {
        // ORISO-Admin#917: the standard bundle has `Agency.read` but no `agency-admin` role and
        // used to lose the entry to an over-broad role gate.
        const items = build({
            isSuperAdmin: false,
            hasRole: hasRoleFor(UserRole.RestrictedAgencyAdmin, UserRole.UserAdmin),
            can: canFor(Resource.Agency, Resource.Consultant),
            labels,
            settingsPath: '/admin/theme-settings/legal',
        });

        const agency = items.find((item) => item.key === 'agency');
        expect(agency?.to).toBe(routePathNames.agency);
        expect(agency?.label).toBe(labels.agency);
    });

    it('hides the Beratungsstellen entry from an admin without Agency read', () => {
        const items = build({
            isSuperAdmin: false,
            hasRole: hasRoleFor(UserRole.UserAdmin),
            can: canFor(Resource.Consultant),
            labels,
            settingsPath: '/admin/theme-settings/legal',
        });

        expect(items.some((item) => item.key === 'agency')).toBe(false);
    });

    it('shows no log entry for an admin without consultant read', () => {
        const items = build({
            isSuperAdmin: false,
            hasRole: hasRoleFor(UserRole.RestrictedAgencyAdmin),
            can: canFor(Resource.Agency),
            labels,
            settingsPath: '/admin/theme-settings/legal',
        });

        expect(items.some((item) => item.key === 'logs')).toBe(false);
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

    it('routes a platform admin without Update Tenant to the case-handover logs', () => {
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

        expect(items.find((item) => item.key === 'logs')?.to).toBe(routePathNames.caseHandoverLogs);
        expect(items.some((item) => item.key === 'tenants')).toBe(false);
    });

    describe('"Links" entry', () => {
        const linksEntry = (items: ReturnType<typeof build>) => items.find((item) => item.key === 'links');

        it('is shown to the platform admin', () => {
            const items = build({
                isSuperAdmin: true,
                hasRole: hasRoleFor(UserRole.TenantAdmin, UserRole.AgencyAdmin),
                can: canFor(Resource.Tenant, Resource.Agency, Resource.Consultant),
                labels,
                settingsPath: '/admin/theme-settings/global-config',
            });
            expect(linksEntry(items)).toBeDefined();
        });

        it('is shown to a Träger admin (who may invite counsellors)', () => {
            const items = build({
                isSuperAdmin: false,
                hasRole: hasRoleFor(UserRole.TenantAdmin, UserRole.UserAdmin),
                can: canFor(Resource.Tenant, Resource.Consultant, Resource.AgencyAdminUser),
                labels,
                settingsPath: '/admin/theme-settings/general',
            });
            expect(linksEntry(items)).toBeDefined();
        });

        it.each([
            ['agency-admin + user-admin', hasRoleFor(UserRole.AgencyAdmin, UserRole.UserAdmin)],
            ['restricted-agency-admin + user-admin', hasRoleFor(UserRole.RestrictedAgencyAdmin, UserRole.UserAdmin)],
        ])('is hidden from a Beratungsstellen-Admin (%s) even with Agency read', (_label, hasRole) => {
            const items = build({
                isSuperAdmin: false,
                hasRole,
                can: canFor(Resource.Agency, Resource.AgencyAdminUser, Resource.Consultant),
                labels,
                settingsPath: '/admin/theme-settings/general',
            });
            expect(linksEntry(items)).toBeUndefined();
        });
    });
});
