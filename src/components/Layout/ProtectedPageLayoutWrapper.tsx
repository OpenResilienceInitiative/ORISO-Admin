import { useEffect } from 'react';
import { ReactQueryDevtools } from 'react-query/devtools';
import { Layout } from 'antd';
import { NavLink, useLocation, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import classNames from 'classnames';
import routePathNames from '../../appConfig';
import SiteFooter from './SiteFooter';
import SiteHeader from './SiteHeader';
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
import { useUserPermissions } from '../../hooks/useUserPermission';
import styles from './styles.module.scss';

const { Content, Sider } = Layout;

const ProtectedPageLayoutWrapper = ({ children }: any) => {
    const { settings } = useAppConfigContext();
    const { can } = useUserPermissions();
    const { subdomain } = getLocationVariables();
    const { hasRole } = useUserRoles();
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
        if (subdomain !== tenantData.subdomain && !settings.multitenancyWithSingleDomainEnabled) {
            console.log('🔍 ProtectedPageLayoutWrapper: Subdomain mismatch, but not logging out for debugging');
            console.log('🔍 ProtectedPageLayoutWrapper: subdomain:', subdomain);
            console.log('🔍 ProtectedPageLayoutWrapper: tenantData.subdomain:', tenantData.subdomain);
            // logout(true);
        }
    }, [subdomain, tenantData.subdomain]);

    const checkActive = (path: string) => {
        return location.pathname.includes(path);
    };

    const usersPage = () => {
        if (can(PermissionAction.Read, Resource.Consultant)) {
            return routePathNames.consultants;
        }
        if (can(PermissionAction.Read, Resource.AgencyAdminUser)) {
            return routePathNames.agencyAdmins;
        }
        return routePathNames.tenantAdmins;
    };

    return (
        <>
            <Layout className="protectedLayout">
                <Sider width={96}>
                    <div className="logo" />
                    <nav className="mainMenu">
                        <ul>
                            {(can(PermissionAction.Read, Resource.Tenant) ||
                                can(PermissionAction.Read, Resource.LegalText)) && (
                                <li key="theme" className="menuItem">
                                    <NavLink
                                        to={routePathNames.themeSettings}
                                        className={({ isActive }) => (isActive ? 'active' : '')}
                                    >
                                        <NavIcon path={routePathNames.themeSettings} />
                                        <span>{t('settings.title')}</span>
                                    </NavLink>
                                </li>
                            )}

                            {can(PermissionAction.Create, Resource.Tenant) && (
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
                                        <span>{t('users.title')}</span>
                                    </NavLink>
                                </li>
                            )}

                            {can(PermissionAction.Read, Resource.Agency) && (
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

                            {/* {can(PermissionAction.Read, Resource.Topic) && isEnabled(FeatureFlag.Topics) && (
                                <li key="topics" className="menuItem">
                                    <NavLink
                                        to={routePathNames.topics}
                                        className={({ isActive }) => (isActive ? 'active' : '')}
                                    >
                                        <NavIcon path={routePathNames.topics} />
                                        <span>{t('topics.title')}</span>
                                    </NavLink>
                                </li>
                            )} */}

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
                    <SiteHeader />
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
