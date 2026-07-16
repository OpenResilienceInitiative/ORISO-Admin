import { useEffect } from 'react';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Layout } from 'antd';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import classNames from 'classnames';
import routePathNames from '../../appConfig';
import { getDefaultSettingsPath } from '../../constants/settingsTabs';
import { canReadCaseHandoverAdmin, canSeeSupervisorLogs } from '../../constants/caseHandoverAccess';
import SiteFooter from './SiteFooter';
import { handleTokenRefresh } from '../../api/auth/auth';
import logout from '../../api/auth/logout';
import getLocationVariables from '../../utils/getLocationVariables';
import { useUserRoles } from '../../hooks/useUserRoles.hook';
import { useTenantData } from '../../hooks/useTenantData.hook';
import { UserRole } from '../../enums/UserRole';
import { useFeatureContext } from '../../context/FeatureContext';
import AdminSidebar, { AdminSidebarNavItem } from './AdminSidebar';
import { FeatureFlag } from '../../enums/FeatureFlag';
import { useAppConfigContext } from '../../context/useAppConfig';
import { PermissionAction } from '../../enums/PermissionAction';
import { Resource } from '../../enums/Resource';
import { ReleaseToggle } from '../../enums/ReleaseToggle';
import { useReleasesToggle } from '../../hooks/useReleasesToggle.hook';
import { useUserPermissions } from '../../hooks/useUserPermission';
import styles from './styles.module.scss';
import { clearStuckOverlays } from '../../utils/clearStuckOverlays';

const { Content } = Layout;

const ProtectedPageLayoutWrapper = ({ children }: any) => {
    const { settings } = useAppConfigContext();
    const { can } = useUserPermissions();
    const { subdomain } = getLocationVariables();
    const { hasRole, isSuperAdmin } = useUserRoles();
    const { data: tenantData } = useTenantData();
    const { t, i18n } = useTranslation();
    const location = useLocation();
    const handleLogout = () => {
        logout(true);
    };
    const { isEnabled, toggleFeature } = useFeatureContext();
    const [searchParams] = useSearchParams();
    // add this to url to enable developer mode -> ?developer=true
    const developer = searchParams.get('developer');

    useEffect(() => {
        // handle a refresh as registered user and not initialize a new user
        handleTokenRefresh();

        if (!isEnabled(FeatureFlag.Developer) && developer === 'true') {
            toggleFeature(FeatureFlag.Developer);
        }
    }, []);

    useEffect(() => {
        clearStuckOverlays();
    }, [location.pathname]);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                clearStuckOverlays();
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, []);

    useEffect(() => {
        // Guard: tenantData.subdomain is empty until the tenant query resolves.
        // Only logout once we know the tenant and detect an actual mismatch.
        if (
            tenantData.subdomain &&
            subdomain !== tenantData.subdomain &&
            !settings.multitenancyWithSingleDomainEnabled
        ) {
            logout(true);
        }
    }, [subdomain, tenantData.subdomain]);

    const { isEnabled: isReleaseEnabled } = useReleasesToggle();
    const shouldShowThemeSettings =
        (settings.multitenancyWithSingleDomainEnabled && hasRole(UserRole.TenantAdmin)) ||
        (!settings.multitenancyWithSingleDomainEnabled && hasRole(UserRole.SingleTenantAdmin));

    const usersPage = () => {
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

    const canSeeSettingsMenu =
        can(PermissionAction.Read, Resource.Tenant) || can(PermissionAction.Read, Resource.LegalText);
    const canSeeCounsellorLogs = canSeeSupervisorLogs(isSuperAdmin, hasRole, can);
    const canSeeCaseHandoverLogs = canReadCaseHandoverAdmin(isSuperAdmin, hasRole, can);
    const canSeeInactiveAuditLogs = isSuperAdmin && can(PermissionAction.Update, Resource.Tenant);
    const canSeeActivityLogs = canSeeCaseHandoverLogs || canSeeInactiveAuditLogs;
    const navLanguage = i18n.resolvedLanguage || i18n.language;
    const navLabel = (key: string, fallbackKey: string) => t(key, t(fallbackKey));
    const navLabels = {
        account: navLabel('sidebar.account', 'profile.title'),
        agency: navLabel('sidebar.agency', 'agency'),
        activityLogs: navLabel('sidebar.activityLogs', 'logs.title'),
        inactiveAudit: navLabel('sidebar.inactiveAudit', 'inactiveAudit.title'),
        caseHandoverLogs: navLabel('sidebar.caseHandoverLogs', 'caseHandoverLogs.title'),
        links: navLabel('sidebar.links', 'links.navTitle'),
        logout: navLabel('sidebar.logout', 'logout'),
        logs: navLabel('sidebar.logs', 'logs.title'),
        settings: navLabel('sidebar.settings', 'settings.title'),
        statistics: navLabel('sidebar.statistics', 'statistic.title'),
        tenants: navLabel('sidebar.tenants', 'tenants.navTitle'),
        users: navLabel('sidebar.users', 'users.allUsers'),
    };

    const settingsPath = getDefaultSettingsPath({
        isSuperAdmin,
        shouldShowThemeSettings,
        can,
        isTenantSettingsEditEnabled: isReleaseEnabled(ReleaseToggle.TENANT_ADMIN_SETTINGS_EDIT),
        multitenancyWithSingleDomainEnabled: settings.multitenancyWithSingleDomainEnabled,
    });

    // Resolve which nav items the current user may see. All the permission/role/feature
    // logic stays here; the presentational <AdminSidebar> just renders what it is given.
    const upperNavItems: AdminSidebarNavItem[] = [];
    if (canSeeSettingsMenu) {
        upperNavItems.push({
            key: 'theme',
            to: settingsPath,
            label: navLabels.settings,
            iconPath: routePathNames.themeSettings,
            activeMatch: { paths: [routePathNames.themeSettings], mode: 'includes' },
        });
    }
    if (isSuperAdmin && can(PermissionAction.Create, Resource.Tenant)) {
        upperNavItems.push({
            key: 'tenants',
            to: routePathNames.tenants,
            label: navLabels.tenants,
            iconPath: routePathNames.tenants,
            activeMatch: { paths: [routePathNames.tenants], mode: 'includes' },
        });
    }
    if (
        can(PermissionAction.Read, Resource.Agency) &&
        (hasRole(UserRole.AgencyAdmin) || !hasRole(UserRole.RestrictedAgencyAdmin))
    ) {
        upperNavItems.push({
            key: 'agency',
            to: routePathNames.agency,
            label: navLabels.agency,
            iconPath: routePathNames.agency,
            activeMatch: { paths: [routePathNames.agency], mode: 'includes' },
        });
    }
    if (
        can(PermissionAction.Read, Resource.Consultant) ||
        can(PermissionAction.Read, Resource.AgencyAdminUser) ||
        can(PermissionAction.Read, Resource.TenantAdminUser)
    ) {
        upperNavItems.push({
            key: 'counselors',
            to: usersPage(),
            label: navLabels.users,
            iconPath: '/admin/users',
            activeMatch: { paths: ['/admin/users'], mode: 'includes' },
        });
    }
    if (can(PermissionAction.Read, Resource.Statistic)) {
        upperNavItems.push({
            key: 'statistics',
            to: routePathNames.statistic,
            label: navLabels.statistics,
            iconPath: routePathNames.statistic,
        });
    }
    if (
        can(PermissionAction.Read, Resource.Agency) ||
        can(PermissionAction.Read, Resource.AgencyAdminUser) ||
        hasRole(UserRole.RestrictedAgencyAdmin)
    ) {
        upperNavItems.push({
            key: 'links',
            to: routePathNames.links,
            label: navLabels.links,
            iconPath: routePathNames.links,
            activeMatch: { paths: [`${routePathNames.links}/`], mode: 'startsWith' },
        });
    }
    if (canSeeCounsellorLogs) {
        upperNavItems.push({
            key: 'logs',
            to: routePathNames.logs,
            label: navLabels.logs,
            iconPath: routePathNames.logs,
            end: true,
        });
    }

    // Case-handover + inactive-account audit are unified into a single "Logs"
    // entry that opens a tabbed page (Inactive default, then Case handover).
    if (canSeeActivityLogs) {
        upperNavItems.push({
            key: 'activity-logs',
            to: canSeeInactiveAuditLogs ? routePathNames.inactiveAccountAuditLogs : routePathNames.caseHandoverLogs,
            label: navLabels.logs,
            iconPath: routePathNames.inactiveAccountAuditLogs,
            activeMatch: {
                paths: [routePathNames.inactiveAccountAuditLogs, routePathNames.caseHandoverLogs],
                mode: 'startsWith',
            },
        });
    }

    const accountNavItem: AdminSidebarNavItem = {
        key: 'account',
        to: routePathNames.userProfile,
        label: navLabels.account,
        iconPath: routePathNames.userProfile,
    };

    return (
        <>
            <Layout className="protectedLayout">
                <AdminSidebar
                    items={upperNavItems}
                    account={accountNavItem}
                    logout={{ label: navLabels.logout, onLogout: handleLogout }}
                    lang={navLanguage}
                    currentPath={location.pathname}
                />

                <Layout className={classNames(styles.mainContent)}>
                    <Content className={styles.content}>
                        {children}
                        {!hasRole(UserRole.TenantAdmin) && <SiteFooter />}
                    </Content>
                </Layout>
            </Layout>
            {isEnabled(FeatureFlag.Developer) && <ReactQueryDevtools />}
        </>
    );
};

export default ProtectedPageLayoutWrapper;
