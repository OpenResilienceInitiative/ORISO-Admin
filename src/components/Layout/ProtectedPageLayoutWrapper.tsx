import { useEffect } from 'react';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Layout } from 'antd';
import { useLocation, useSearchParams } from 'react-router-dom';
import classNames from 'classnames';
import routePathNames from '../../appConfig';
import { handleTokenRefresh } from '../../api/auth/auth';
import logout from '../../api/auth/logout';
import getLocationVariables from '../../utils/getLocationVariables';
import { useTenantData } from '../../hooks/useTenantData.hook';
import { useFeatureContext } from '../../context/FeatureContext';
import AdminSidebar from './AdminSidebar';
import AdminMobileNavBar from './AdminMobileNavBar';
import { MobileNavProvider } from '../AdminMobileNav/MobileNavContext';
import { AdminSearchButton, AdminSearchProvider } from '../AdminSearch';
import { useAdminNavigation } from './useAdminNavigation';
import { FeatureFlag } from '../../enums/FeatureFlag';
import { useAppConfigContext } from '../../context/useAppConfig';
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
    const { subdomain } = getLocationVariables();
    const { data: tenantData } = useTenantData();
    const location = useLocation();
    const handleLogout = () => {
        logout(true, routePathNames.login);
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

    const {
        navItems: upperNavItems,
        accountItem: accountNavItem,
        tree: mobileNavTree,
        logoutLabel,
        navLanguage,
    } = useAdminNavigation({ restricted });
    const navLabels = { logout: logoutLabel };

    return (
        <MobileNavProvider>
            <AdminSearchProvider
                navItems={upperNavItems}
                account={accountNavItem}
                tree={mobileNavTree}
                disabled={restricted}
            >
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
                            tree={mobileNavTree}
                            account={accountNavItem}
                            logout={{ label: navLabels.logout, onLogout: handleLogout }}
                            currentPath={location.pathname}
                        />
                    )}

                    <Layout className={classNames(styles.mainContent)}>
                        {/* Material 3 search bar, centred above the page. Phones
                        have it in the bottom bar (the round button), so no row is spent there. */}
                        {isDesktopLayout && !restricted && (
                            <div className={styles.topBar}>
                                <AdminSearchButton variant="bar" />
                            </div>
                        )}
                        <Content
                            className={classNames(styles.content, {
                                [styles.contentWithTopBar]: isDesktopLayout && !restricted,
                            })}
                        >
                            {children}
                        </Content>
                    </Layout>
                </Layout>
            </AdminSearchProvider>
            {isEnabled(FeatureFlag.Developer) && <ReactQueryDevtools />}
        </MobileNavProvider>
    );
};

export default ProtectedPageLayoutWrapper;
