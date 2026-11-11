import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import routePathNames from '../../appConfig';
import { getDefaultSettingsPath, getSettingsTabs } from '../../constants/settingsTabs';
import { useAppConfigContext } from '../../context/useAppConfig';
import { ReleaseToggle } from '../../enums/ReleaseToggle';
import { UserRole } from '../../enums/UserRole';
import { useReleasesToggle } from '../../hooks/useReleasesToggle.hook';
import { useUserPermissions } from '../../hooks/useUserPermission';
import { useUserRoles } from '../../hooks/useUserRoles.hook';
import type { AdminSidebarNavItem } from './AdminSidebar';
import { buildAdminNavItems } from './adminNavItems';
import { buildAdminNavTree } from './adminNavTree';

/**
 * Everything the navigation shows for the signed-in admin, resolved once:
 * sidebar and mobile bar render it, Home (ORISO-Admin#1323) builds its tiles
 * from it — so no surface can offer an area another one hides.
 *
 * `restricted` strips the layout down to logout only (#891).
 */
export const useAdminNavigation = ({ restricted = false }: { restricted?: boolean } = {}) => {
    const { t, i18n } = useTranslation();
    const { settings } = useAppConfigContext();
    const { can } = useUserPermissions();
    const { hasRole, isSuperAdmin, isTechnicalAccount, tokenUnreadable } = useUserRoles();
    const { isEnabled: isReleaseEnabled } = useReleasesToggle();

    const shouldShowThemeSettings =
        (settings.multitenancyWithSingleDomainEnabled && hasRole(UserRole.TenantAdmin)) ||
        (!settings.multitenancyWithSingleDomainEnabled && hasRole(UserRole.SingleTenantAdmin));
    const isTenantSettingsEditEnabled = isReleaseEnabled(ReleaseToggle.TENANT_ADMIN_SETTINGS_EDIT);
    const canManageServiceNotices = isSuperAdmin && !isTechnicalAccount && !tokenUnreadable;

    const navLabel = (key: string, fallbackKey: string) => t(key, t(fallbackKey));
    const labels = {
        account: navLabel('sidebar.account', 'profile.title'),
        agency: navLabel('sidebar.agency', 'agency'),
        home: navLabel('sidebar.home', 'home.title'),
        links: navLabel('sidebar.links', 'links.navTitle'),
        logout: navLabel('sidebar.logout', 'logout'),
        logs: navLabel('sidebar.logs', 'logs.title'),
        settings: navLabel('sidebar.settings', 'settings.title'),
        statistics: navLabel('sidebar.statistics', 'statistic.title'),
        tenants: navLabel('sidebar.tenants', 'tenants.navTitle'),
        users: navLabel('sidebar.users', 'users.allUsers'),
    };

    const settingsContext = {
        isSuperAdmin,
        canManageServiceNotices,
        shouldShowThemeSettings,
        can,
        isTenantSettingsEditEnabled,
        multitenancyWithSingleDomainEnabled: settings.multitenancyWithSingleDomainEnabled,
    };

    const navItems = restricted
        ? []
        : buildAdminNavItems({
              isSuperAdmin,
              hasRole,
              can,
              labels,
              settingsPath: getDefaultSettingsPath(settingsContext),
          });

    const tree = useMemo(
        () =>
            restricted
                ? {}
                : buildAdminNavTree({
                      isSuperAdmin,
                      hasRole,
                      can,
                      canManageServiceNotices,
                      shouldShowThemeSettings,
                      isTenantSettingsEditEnabled,
                      multitenancyWithSingleDomainEnabled: settings.multitenancyWithSingleDomainEnabled,
                  }),
        [
            can,
            canManageServiceNotices,
            hasRole,
            isSuperAdmin,
            isTenantSettingsEditEnabled,
            restricted,
            settings.multitenancyWithSingleDomainEnabled,
            shouldShowThemeSettings,
        ],
    );

    const accountItem: AdminSidebarNavItem | undefined = restricted
        ? undefined
        : {
              key: 'account',
              to: routePathNames.userProfile,
              label: labels.account,
              iconPath: routePathNames.userProfile,
          };

    return {
        navItems,
        accountItem,
        tree,
        settingsTabs: restricted ? [] : getSettingsTabs(settingsContext),
        logoutLabel: labels.logout,
        navLanguage: i18n.resolvedLanguage || i18n.language,
    };
};
