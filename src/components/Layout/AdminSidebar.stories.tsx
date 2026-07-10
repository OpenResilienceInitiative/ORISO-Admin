import type { Meta, StoryObj } from '@storybook/react-vite';
import { Layout } from 'antd';
import routePathNames from '../../appConfig';
import { AdminSidebar, type AdminSidebarNavItem } from './AdminSidebar';

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
    // Sider must live inside an antd Layout; `protectedLayout` pulls in the app sidebar styles.
    decorators: [
        (Story) => (
            <Layout className="protectedLayout" style={{ minHeight: '100vh' }}>
                <Story />
            </Layout>
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

/** Focus on the grouped "activity logs" section below the main items. */
export const WithActivityLogs: Story = {
    args: {
        items: [settingsItem, usersItem],
        activityLogs,
        currentPath: routePathNames.caseHandoverLogs,
    },
};
