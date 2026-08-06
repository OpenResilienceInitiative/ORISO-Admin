import type { Meta, StoryObj } from '@storybook/react-vite';
import { Layout } from 'antd';
import routePathNames from '../../appConfig';
import { Resource } from '../../enums/Resource';
import { UserRole } from '../../enums/UserRole';
import { AdminSidebar, type AdminSidebarNavItem } from './AdminSidebar';
import { buildAdminNavItems } from './adminNavItems';
import { canFor, hasRoleFor } from './adminNavFixtures';

// Pre-resolved nav items (the wrapper builds these from permissions; the sidebar just renders them).
const settingsItem: AdminSidebarNavItem = {
    key: 'theme',
    to: routePathNames.themeSettings,
    label: 'Einstellungen',
    iconPath: routePathNames.themeSettings,
    activeMatch: { paths: [routePathNames.themeSettings], mode: 'includes' },
};
const tenantsItem: AdminSidebarNavItem = {
    key: 'tenants',
    to: routePathNames.tenants,
    label: 'Mandanten',
    iconPath: routePathNames.tenants,
    activeMatch: { paths: [routePathNames.tenants], mode: 'includes' },
};
const agencyItem: AdminSidebarNavItem = {
    key: 'agency',
    to: routePathNames.agency,
    label: 'Beratungsstellen',
    iconPath: routePathNames.agency,
    activeMatch: { paths: [routePathNames.agency], mode: 'includes' },
};
const usersItem: AdminSidebarNavItem = {
    key: 'counselors',
    to: routePathNames.users,
    label: 'Benutzer',
    iconPath: '/admin/users',
    activeMatch: { paths: ['/admin/users'], mode: 'includes' },
};
const statisticsItem: AdminSidebarNavItem = {
    key: 'statistics',
    to: routePathNames.statistic,
    label: 'Statistik',
    iconPath: routePathNames.statistic,
};
const linksItem: AdminSidebarNavItem = {
    key: 'links',
    to: routePathNames.links,
    label: 'Links',
    iconPath: routePathNames.links,
    activeMatch: { paths: [`${routePathNames.links}/`], mode: 'startsWith' },
};
const logsItem: AdminSidebarNavItem = {
    key: 'logs',
    to: routePathNames.logs,
    label: 'Logs',
    iconPath: routePathNames.logs,
    end: true,
};

const accountItem: AdminSidebarNavItem = {
    key: 'account',
    to: routePathNames.userProfile,
    label: 'Mein Konto',
    iconPath: routePathNames.userProfile,
};

const activityLogs = {
    label: 'Aktivitätsprotokolle',
    items: [
        {
            key: 'case-handover-logs',
            to: routePathNames.caseHandoverLogs,
            label: 'Fallübergaben',
            iconPath: routePathNames.caseHandoverLogs,
        },
        {
            key: 'inactive-audit-logs',
            to: routePathNames.inactiveAccountAuditLogs,
            label: 'Inaktive Konten',
            iconPath: routePathNames.inactiveAccountAuditLogs,
        },
    ] as AdminSidebarNavItem[],
};

const meta = {
    title: 'Molecules/AdminSidebar',
    component: AdminSidebar,
    parameters: { layout: 'fullscreen' },
    // The real rail is `height: 100vh`; render it inside a fixed-height frame so the whole
    // sidebar is shown in one piece instead of overflowing a short Storybook canvas.
    // Sider must live inside an antd Layout; `protectedLayout` pulls in the app sidebar styles.
    decorators: [
        (Story) => (
            <div className="adminSidebarStoryFrame" style={{ display: 'flex', height: 760 }}>
                <style>{`.adminSidebarStoryFrame .ant-layout-sider{height:100%!important;min-height:0!important}`}</style>
                <Layout className="protectedLayout" style={{ height: '100%', minHeight: 0 }}>
                    <Story />
                </Layout>
            </div>
        ),
    ],
    args: {
        account: accountItem,
        logout: { label: 'Abmelden', onLogout: () => {} },
        lang: 'de',
        currentPath: routePathNames.agency,
    },
} satisfies Meta<typeof AdminSidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Super-admin: every top-level entry plus the grouped activity-logs section. */
export const SuperAdmin: Story = {
    args: {
        items: [settingsItem, tenantsItem, agencyItem, usersItem, statisticsItem, linksItem, logsItem],
        activityLogs,
    },
};

/**
 * Tenant admin: a tenant-scoped admin sees settings, users, statistics and links — but not
 * the super-admin-only tenants entry, and (lacking Agency read) no agencies entry. Shows the
 * different visibility rules vs. the super-admin rail.
 */
export const TenantAdmin: Story = {
    args: {
        items: [settingsItem, usersItem, statisticsItem, linksItem],
        currentPath: routePathNames.themeSettings,
    },
};

/** Agency admin: only the agencies, users and links entries (no tenants/settings/logs). */
export const AgencyAdmin: Story = {
    args: {
        items: [agencyItem, usersItem, linksItem],
        currentPath: routePathNames.links,
    },
};

/** Minimal access: no top-level entries — just the account link and logout. */
export const MinimalAccess: Story = {
    args: {
        items: [],
        currentPath: routePathNames.userProfile,
    },
};

/**
 * Träger admin who also holds `user-admin` — the role mix that reported the duplicate "Logs"
 * menu (ORISO-Admin#84). Unlike the other stories, the items here come from the **real**
 * `buildAdminNavItems` builder, so this story shows production output and fails visibly if the
 * log views are ever split back into two nav entries.
 */
export const TenantAdminWithUserAdmin: Story = {
    args: {
        items: buildAdminNavItems({
            isSuperAdmin: false,
            hasRole: hasRoleFor(UserRole.TenantAdmin, UserRole.UserAdmin),
            can: canFor(
                Resource.Tenant,
                Resource.LegalText,
                Resource.Consultant,
                Resource.AgencyAdminUser,
                Resource.TenantAdminUser,
                Resource.Statistic,
            ),
            labels: {
                account: 'Mein Konto',
                agency: 'Beratungsstellen',
                links: 'Links',
                logs: 'Logs',
                settings: 'Einstellungen',
                statistics: 'Statistik',
                tenants: 'Mandanten',
                users: 'Benutzer',
            },
            settingsPath: `${routePathNames.themeSettings}/general`,
        }),
        currentPath: routePathNames.logs,
    },
};

/**
 * Beratungsstellen-Admin (`restricted-agency-admin` + `user-admin`) — the lowest admin level, and
 * the one a platform-admin test account never exercises. Real builder output: one "Logs" entry,
 * same as every other role.
 */
export const RestrictedAgencyAdmin: Story = {
    args: {
        items: buildAdminNavItems({
            isSuperAdmin: false,
            hasRole: hasRoleFor(UserRole.RestrictedAgencyAdmin, UserRole.UserAdmin),
            can: canFor(Resource.Agency, Resource.Consultant),
            labels: {
                account: 'Mein Konto',
                agency: 'Beratungsstellen',
                links: 'Links',
                logs: 'Logs',
                settings: 'Einstellungen',
                statistics: 'Statistik',
                tenants: 'Träger',
                users: 'Benutzer',
            },
            settingsPath: `${routePathNames.themeSettings}/legal`,
        }),
        currentPath: routePathNames.logs,
    },
};

/** Focus on the grouped "activity logs" section below the main items. */
export const WithActivityLogs: Story = {
    args: {
        items: [settingsItem, usersItem],
        activityLogs,
        currentPath: routePathNames.caseHandoverLogs,
    },
};
