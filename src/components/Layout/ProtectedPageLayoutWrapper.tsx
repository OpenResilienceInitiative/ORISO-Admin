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
    const { t } = useTranslation();
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
        if (subdomain !== tenantData.subdomain && !settings.multitenancyWithSingleDomainEnabled) {
            // console.log('🔍 ProtectedPageLayoutWrapper: Subdomain mismatch, but not logging out for debugging');
            // console.log('🔍 ProtectedPageLayoutWrapper: subdomain:', subdomain);
            // console.log('🔍 ProtectedPageLayoutWrapper: tenantData.subdomain:', tenantData.subdomain);
            // logout(true);
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
                                        className={({ isActive }) =>
                                            isActive || checkActive(routePathNames.themeSettings) ? 'active' : ''
                                        }
                                    >
                                        <NavIcon path={routePathNames.themeSettings} />
                                        <span>{t('settings.title')}</span>
                                    </NavLink>
                                </li>
                            )}

                            {isSuperAdmin && can(PermissionAction.Create, Resource.Tenant) && (
                                <li key="tenants" className="menuItem">
                                    <NavLink
                                        to={routePathNames.tenants}
                                        className={classNames({ active: checkActive(routePathNames.tenants) })}
                                    >
                                        <NavIcon path={routePathNames.tenants} />
                                        <span>{t('tenants.navTitle')}</span>
                                    </NavLink>
                                </li>
                            )}
                            {(can(PermissionAction.Read, Resource.Consultant) ||
                                can(PermissionAction.Read, Resource.AgencyAdminUser) ||
                                can(PermissionAction.Read, Resource.TenantAdminUser)) && (
                                <li key="counselors" className="menuItem">
                                    <NavLink
                                        to={usersPage()}
                                        className={classNames({ active: checkActive('/admin/users') })}
                                    >
                                        <NavIcon path="/admin/users" />
                                        <span>{t('users.allUsers')}</span>
                                    </NavLink>
                                </li>
                            )}

                            {can(PermissionAction.Read, Resource.Agency) && !hasRole(UserRole.RestrictedAgencyAdmin) && (
                                <li className="menuItem">
                                    <NavLink
                                        to={routePathNames.agency}
                                        className={classNames({ active: checkActive(routePathNames.agency) })}
                                    >
                                        <NavIcon path={routePathNames.agency} />
                                        <span>{t('agency')}</span>
                                    </NavLink>
                                </li>
                            )}

                            {can(PermissionAction.Read, Resource.Statistic) && (
                                <li key="statistics" className="menuItem">
                                    <NavLink
                                        to={routePathNames.statistic}
                                        className={({ isActive }) => (isActive ? 'active' : '')}
                                    >
                                        <NavIcon path={routePathNames.statistic} />
                                        <span>{t('statistic.title')}</span>
                                    </NavLink>
                                </li>
                            )}

                            {!isSuperAdmin &&
                                can(PermissionAction.Read, Resource.Consultant) &&
                                !hasRole(UserRole.RestrictedAgencyAdmin) && (
                                    <li key="logs" className="menuItem">
                                        <NavLink
                                            to={routePathNames.logs}
                                            className={({ isActive }) => (isActive ? 'active' : '')}
                                        >
                                            <NavIcon path={routePathNames.logs} />
                                            <span>{t('logs.title')}</span>
                                        </NavLink>
                                    </li>
                                )}
                            {(can(PermissionAction.Read, Resource.Agency) ||
                                can(PermissionAction.Read, Resource.AgencyAdminUser) ||
                                hasRole(UserRole.RestrictedAgencyAdmin)) && (
                                <li key="links" className="menuItem">
                                    <NavLink
                                        to={routePathNames.links}
                                        className={({ isActive }) =>
                                            isActive || location.pathname.startsWith(`${routePathNames.links}/`)
                                                ? 'active'
                                                : ''
                                        }
                                    >
                                        <NavIcon path={routePathNames.links} />
                                        <span>{t('links.navTitle', 'Links')}</span>
                                    </NavLink>
                                </li>
                            )}

                            {isSuperAdmin && can(PermissionAction.Update, Resource.Tenant) && (
                                <li key="inactive-audit-logs" className="menuItem">
                                    <NavLink
                                        to={routePathNames.inactiveAccountAuditLogs}
                                        className={({ isActive }) => (isActive ? 'active' : '')}
                                    >
                                        <NavIcon path={routePathNames.inactiveAccountAuditLogs} />
                                        <span>{t('inactiveAudit.title')}</span>
                                    </NavLink>
                                </li>
                            )}
                        </ul>

                        <ul className="lowerSidebar">
                            <li className="menuItem">
                                <NavLink
                                    to={routePathNames.userProfile}
                                    className={({ isActive }) => (isActive ? 'active' : '')}
                                >
                                    <NavIcon path={routePathNames.userProfile} />
                                    <span>{t('profile.title')}</span>
                                </NavLink>
                            </li>

                            <li className="menuItem">
                                <button onClick={handleLogout} type="button">
                                    <NavIcon path="logout" />
                                    <span className="logout">{t('logout')}</span>
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
