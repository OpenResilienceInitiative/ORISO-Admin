import { ComponentType, lazy } from 'react';

const lazyNamed = <TModule extends Record<string, ComponentType<any>>>(
    factory: () => Promise<TModule>,
    exportName: keyof TModule,
) => lazy(() => factory().then((module) => ({ default: module[exportName] })));

export const LazyTenantSettingsLayout = lazyNamed(() => import('./TenantSettings'), 'TenantSettingsLayout');
export const LazyTopicList = lazyNamed(() => import('./Topics/List/TopicList'), 'TopicList');
export const LazyStatistic = lazyNamed(() => import('./Statistic'), 'Statistic');
export const LazyUserProfile = lazyNamed(() => import('./Profile/UserProfile'), 'UserProfile');
export const LazyAgencyList = lazyNamed(() => import('./Agency/List'), 'AgencyList');
export const LazyTenantsList = lazyNamed(() => import('./Tenants/List'), 'TenantsList');
export const LazyAgencyPageEdit = lazyNamed(() => import('./Agency/Edit'), 'AgencyPageEdit');
export const LazyUsersList = lazyNamed(() => import('./users/List'), 'UsersList');
export const LazyUserEditOrAdd = lazyNamed(() => import('./users/Edit'), 'UserEditOrAdd');
export const LazyGeneralSettingsPage = lazyNamed(
    () => import('./TenantSettings/GeneralSettings'),
    'GeneralSettingsPage',
);
export const LazyLegalSettingsPage = lazyNamed(() => import('./TenantSettings/LegalSettings'), 'LegalSettingsPage');
export const LazyTopicEditOrAdd = lazyNamed(() => import('./Topics/Edit'), 'TopicEditOrAdd');
export const LazyTenantEditOrAdd = lazyNamed(() => import('./Tenants/Edit'), 'TenantEditOrAdd');
export const LazyTenantAdminEditOrAdd = lazyNamed(() => import('./users/TenantAdminEdit'), 'TenantAdminEditOrAdd');
export const LazyGeneralTenantSettings = lazyNamed(() => import('./Tenants/Edit/General'), 'GeneralTenantSettings');
export const LazyTenantThemeSettings = lazyNamed(() => import('./Tenants/Edit/ThemeSettings'), 'TenantThemeSettings');
export const LazyTenantAppSettings = lazyNamed(() => import('./Tenants/Edit/AppSettings'), 'TenantAppSettings');
export const LazyTenantGlobalSettings = lazyNamed(
    () => import('./Tenants/Edit/GlobalSettings'),
    'TenantGlobalSettings',
);
export const LazySingleLegalSettings = lazyNamed(() => import('./Tenants/Edit/LegalSettings'), 'SingleLegalSettings');
export const LazyAppSettingsPage = lazyNamed(() => import('./TenantSettings/AppSettings'), 'AppSettingsPage');
export const LazyPermissionsSettingsPage = lazyNamed(
    () => import('./TenantSettings/PermissionsSettings'),
    'PermissionsSettingsPage',
);
export const LazyUnifiedSmtpSettingsPage = lazyNamed(
    () => import('./TenantSettings/UnifiedSmtpSettings'),
    'UnifiedSmtpSettingsPage',
);
export const LazySupervisorLogsPage = lazyNamed(() => import('./Logs/SupervisorLogs'), 'SupervisorLogsPage');
export const LazyInactiveAccountAuditLogsPage = lazyNamed(
    () => import('./Logs/InactiveAccountAuditLogs'),
    'InactiveAccountAuditLogsPage',
);
export const LazyInviteLinksPage = lazyNamed(() => import('./InviteLinks'), 'InviteLinksPage');
export const LazyLinksPage = lazyNamed(() => import('./Links'), 'LinksPage');
export const LazyLinksIndexRedirect = lazyNamed(() => import('./Links'), 'LinksIndexRedirect');
export const LazyTenantInvitesTab = lazyNamed(() => import('./Links/AccountInvitesTab'), 'TenantInvitesTab');
export const LazyCounsellorInvitesTab = lazyNamed(() => import('./Links/AccountInvitesTab'), 'CounsellorInvitesTab');
export const LazyExternalInboundsTab = lazyNamed(() => import('./Links/ExternalInboundsTab'), 'ExternalInboundsTab');
export const LazyGlobalLoginSettingsPage = lazyNamed(() => import('./GlobalSettings'), 'GlobalLoginSettingsPage');
