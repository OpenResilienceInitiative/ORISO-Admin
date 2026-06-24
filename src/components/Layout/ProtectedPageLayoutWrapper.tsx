import { useEffect } from 'react';
import { ReactQueryDevtools } from 'react-query/devtools';
import { Layout } from 'antd';
import { NavLink, useLocation, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import classNames from 'classnames';
import routePathNames from '../../appConfig';
import { getDefaultSettingsPath } from '../../constants/settingsTabs';
import SiteFooter from './SiteFooter';
import { handleTokenRefresh } from '../../api/auth/auth';
import logout from '../../api/auth/logout';
import getLocationVariables from '../../utils/getLocationVariables';
import { useUserRoles } from '../../hooks/useUserRoles.hook';
import { useTenantData } from '../../hooks/useTenantData.hook';
import { UserRole } from '../../enums/UserRole';
import { useFeatureContext } from '../../context/FeatureContext';
import { NavIcon } from './NavIcon';
import { FeatureFlag } from '../../enums/FeatureFlag';
import { useAppConfigContext } from '../../context/useAppConfig';
import { PermissionAction } from '../../enums/PermissionAction';
import { Resource } from '../../enums/Resource';
import { ReleaseToggle } from '../../enums/ReleaseToggle';
import { useReleasesToggle } from '../../hooks/useReleasesToggle.hook';
import { useUserPermissions } from '../../hooks/useUserPermission';
import styles from './styles.module.scss';
import { clearStuckOverlays } from '../../utils/clearStuckOverlays';

const { Content, Sider } = Layout;

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
        if (tenantData.subdomain && subdomain !== tenantData.subdomain && !settings.multitenancyWithSingleDomainEnabled) {
            logout(true);
        }
    }, [subdomain, tenantData.subdomain]);

    const checkActive = (path: string) => {
        return location.pathname.includes(path);
    };

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
    const navLanguage = i18n.resolvedLanguage || i18n.language;
    const navLabel = (key: string, fallbackKey: string) => t(key, t(fallbackKey));
    const navLabels = {
        account: navLabel('sidebar.account', 'profile.title'),
        agency: navLabel('sidebar.agency', 'agency'),
        inactiveAudit: navLabel('sidebar.inactiveAudit', 'inactiveAudit.title'),
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

    return (
        <>
            <Layout className="protectedLayout">
                <Sider width={85}>
                    <div className="logo" />
                    <nav className="mainMenu">
                        <ul className="upperSidebar">
                            {canSeeSettingsMenu && (
                                <li key="theme" className="menuItem">
                                    <NavLink
                                        to={settingsPath}
                                        aria-label={navLabels.settings}
                                        title={navLabels.settings}
                                        className={({ isActive }) =>
                                            isActive || checkActive(routePathNames.themeSettings) ? 'active' : ''
                                        }
                                    >
                                        <NavIcon path={routePathNames.themeSettings} />
                                        <span lang={navLanguage}>{navLabels.settings}</span>
                                    </NavLink>
                                </li>
                            )}

                            {isSuperAdmin && can(PermissionAction.Create, Resource.Tenant) && (
                                <li key="tenants" className="menuItem">
                                    <NavLink
                                        to={routePathNames.tenants}
                                        aria-label={navLabels.tenants}
                                        title={navLabels.tenants}
                                        className={classNames({ active: checkActive(routePathNames.tenants) })}
                                    >
                                        <NavIcon path={routePathNames.tenants} />
                                        <span lang={navLanguage}>{navLabels.tenants}</span>
                                    </NavLink>
                                </li>
                            )}

                            {can(PermissionAction.Read, Resource.Agency) &&
                                (hasRole(UserRole.AgencyAdmin) || !hasRole(UserRole.RestrictedAgencyAdmin)) && (
                                    <li className="menuItem">
                                        <NavLink
                                            to={routePathNames.agency}
                                            aria-label={navLabels.agency}
                                            title={navLabels.agency}
                                            className={classNames({ active: checkActive(routePathNames.agency) })}
                                        >
                                            <NavIcon path={routePathNames.agency} />
                                            <span lang={navLanguage}>{navLabels.agency}</span>
                                        </NavLink>
                                    </li>
                                )}

                            {(can(PermissionAction.Read, Resource.Consultant) ||
                                can(PermissionAction.Read, Resource.AgencyAdminUser) ||
                                can(PermissionAction.Read, Resource.TenantAdminUser)) && (
                                <li key="counselors" className="menuItem">
                                    <NavLink
                                        to={usersPage()}
                                        aria-label={navLabels.users}
                                        title={navLabels.users}
                                        className={classNames({ active: checkActive('/admin/users') })}
                                    >
                                        <NavIcon path="/admin/users" />
                                        <span lang={navLanguage}>{navLabels.users}</span>
                                    </NavLink>
                                </li>
                            )}

                            {can(PermissionAction.Read, Resource.Statistic) && (
                                <li key="statistics" className="menuItem">
                                    <NavLink
                                        to={routePathNames.statistic}
                                        aria-label={navLabels.statistics}
                                        title={navLabels.statistics}
                                        className={({ isActive }) => (isActive ? 'active' : '')}
                                    >
                                        <NavIcon path={routePathNames.statistic} />
                                        <span lang={navLanguage}>{navLabels.statistics}</span>
                                    </NavLink>
                                </li>
                            )}

                            {(can(PermissionAction.Read, Resource.Agency) ||
                                can(PermissionAction.Read, Resource.AgencyAdminUser) ||
                                hasRole(UserRole.RestrictedAgencyAdmin)) && (
                                <li key="links" className="menuItem">
                                    <NavLink
                                        to={routePathNames.links}
                                        aria-label={navLabels.links}
                                        title={navLabels.links}
                                        className={({ isActive }) =>
                                            isActive || location.pathname.startsWith(`${routePathNames.links}/`)
                                                ? 'active'
                                                : ''
                                        }
                                    >
                                        <NavIcon path={routePathNames.links} />
                                        <span lang={navLanguage}>{navLabels.links}</span>
                                    </NavLink>
                                </li>
                            )}

                            {!isSuperAdmin &&
                                can(PermissionAction.Read, Resource.Consultant) &&
                                !hasRole(UserRole.RestrictedAgencyAdmin) && (
                                    <li key="logs" className="menuItem">
                                        <NavLink
                                            to={routePathNames.logs}
                                            aria-label={navLabels.logs}
                                            title={navLabels.logs}
                                            className={({ isActive }) => (isActive ? 'active' : '')}
                                        >
                                            <NavIcon path={routePathNames.logs} />
                                            <span lang={navLanguage}>{navLabels.logs}</span>
                                        </NavLink>
                                    </li>
                                )}

                            {isSuperAdmin && can(PermissionAction.Update, Resource.Tenant) && (
                                <li key="inactive-audit-logs" className="menuItem">
                                    <NavLink
                                        to={routePathNames.inactiveAccountAuditLogs}
                                        aria-label={navLabels.inactiveAudit}
                                        title={navLabels.inactiveAudit}
                                        className={({ isActive }) => (isActive ? 'active' : '')}
                                    >
                                        <NavIcon path={routePathNames.inactiveAccountAuditLogs} />
                                        <span lang={navLanguage}>{navLabels.inactiveAudit}</span>
                                    </NavLink>
                                </li>
                            )}
                        </ul>

                        <ul className="lowerSidebar">
                            <li className="menuItem">
                                <NavLink
                                    to={routePathNames.userProfile}
                                    aria-label={navLabels.account}
                                    title={navLabels.account}
                                    className={({ isActive }) => (isActive ? 'active' : '')}
                                >
                                    <NavIcon path={routePathNames.userProfile} />
                                    <span lang={navLanguage}>{navLabels.account}</span>
                                </NavLink>
                            </li>

                            <li className="menuItem">
                                <button
                                    onClick={handleLogout}
                                    type="button"
                                    aria-label={navLabels.logout}
                                    title={navLabels.logout}
                                >
                                    <NavIcon path="logout" />
                                    <span className="logout" lang={navLanguage}>
                                        {navLabels.logout}
                                    </span>
                                </button>
                            </li>
                        </ul>
                    </nav>
                </Sider>

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
