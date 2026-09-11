import { useEffect } from 'react';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Layout } from 'antd';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import classNames from 'classnames';
import routePathNames from '../../appConfig';
import { getDefaultSettingsPath } from '../../constants/settingsTabs';
import { handleTokenRefresh } from '../../api/auth/auth';
import logout from '../../api/auth/logout';
import getLocationVariables from '../../utils/getLocationVariables';
import { useUserRoles } from '../../hooks/useUserRoles.hook';
import { useTenantData } from '../../hooks/useTenantData.hook';
import { UserRole } from '../../enums/UserRole';
import { useFeatureContext } from '../../context/FeatureContext';
import AdminSidebar, { AdminSidebarNavItem } from './AdminSidebar';
import AdminMobileNavBar from './AdminMobileNavBar';
import { MobileNavProvider } from '../AdminMobileNav/MobileNavContext';
import { buildAdminNavItems } from './adminNavItems';
import { FeatureFlag } from '../../enums/FeatureFlag';
import { useAppConfigContext } from '../../context/useAppConfig';
import { ReleaseToggle } from '../../enums/ReleaseToggle';
import { useReleasesToggle } from '../../hooks/useReleasesToggle.hook';
import { useUserPermissions } from '../../hooks/useUserPermission';
import { useIsDesktopLayout } from '../../hooks/useIsDesktopLayout.hook';
import styles from './styles.module.scss';
import { clearStuckOverlays } from '../../utils/clearStuckOverlays';

const { Content } = Layout;

/**
 * `restricted` strips the layout down to logout only (#891). The 2FA gate
 * renders in place of every route, so an admin nav behind it would offer
 * destinations that silently resolve back to the gate — dead links that read
 * like a way out. Logout stays, because it is one of the operations the gated
 * account is still allowed.
 */
const ProtectedPageLayoutWrapper = ({ children, restricted = false }: any) => {
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
    const isDesktopLayout = useIsDesktopLayout();
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

    const navLanguage = i18n.resolvedLanguage || i18n.language;
    const navLabel = (key: string, fallbackKey: string) => t(key, t(fallbackKey));
    const navLabels = {
        account: navLabel('sidebar.account', 'profile.title'),
        agency: navLabel('sidebar.agency', 'agency'),
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

    // Nav items are resolved by the pure `buildAdminNavItems` builder so the visible
    // navigation can be asserted per role (see adminNavItems.test.ts); the presentational
    // <AdminSidebar> just renders what it is given.
    const upperNavItems = restricted
        ? []
        : buildAdminNavItems({
              isSuperAdmin,
              hasRole,
              can,
              labels: navLabels,
              settingsPath,
          });

    const accountNavItem: AdminSidebarNavItem | undefined = restricted
        ? undefined
        : {
              key: 'account',
              to: routePathNames.userProfile,
              label: navLabels.account,
              iconPath: routePathNames.userProfile,
          };

    return (
        <MobileNavProvider>
            <Layout className="protectedLayout">
                {/* One resolved item list, two presentations. Rendering only the
                    one that applies keeps a single navigation landmark in the
                    accessibility tree instead of two copies of the same links. */}
                {isDesktopLayout ? (
                    <AdminSidebar
                        items={upperNavItems}
                        account={accountNavItem}
                        logout={{ label: navLabels.logout, onLogout: handleLogout }}
                        lang={navLanguage}
                        currentPath={location.pathname}
                    />
                ) : (
                    <AdminMobileNavBar
                        items={upperNavItems}
                        account={accountNavItem}
                        logout={{ label: navLabels.logout, onLogout: handleLogout }}
                        currentPath={location.pathname}
                    />
                )}

                <Layout className={classNames(styles.mainContent)}>
                    <Content className={styles.content}>{children}</Content>
                </Layout>
            </Layout>
            {isEnabled(FeatureFlag.Developer) && <ReactQueryDevtools />}
        </MobileNavProvider>
    );
};

export default ProtectedPageLayoutWrapper;
