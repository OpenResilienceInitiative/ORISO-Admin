import { Outlet } from 'react-router-dom';
import { useMemo } from 'react';
import { Page } from '../../components/Page';
import { getSettingsTabs } from '../../constants/settingsTabs';
import { useAppConfigContext } from '../../context/useAppConfig';
import { ReleaseToggle } from '../../enums/ReleaseToggle';
import { UserRole } from '../../enums/UserRole';
import { useReleasesToggle } from '../../hooks/useReleasesToggle.hook';
import { useUserPermissions } from '../../hooks/useUserPermission';
import { useUserRoles } from '../../hooks/useUserRoles.hook';

export const TenantSettingsLayout = () => {
    const { settings } = useAppConfigContext();
    const { hasRole, isSuperAdmin } = useUserRoles();
    const { can } = useUserPermissions();
    const { isEnabled } = useReleasesToggle();
    const shouldShowThemeSettings =
        (settings.multitenancyWithSingleDomainEnabled && hasRole(UserRole.TenantAdmin)) ||
        (!settings.multitenancyWithSingleDomainEnabled && hasRole(UserRole.SingleTenantAdmin));

    const tabs = useMemo(
        () =>
            getSettingsTabs({
                isSuperAdmin,
                shouldShowThemeSettings,
                can,
                isTenantSettingsEditEnabled: isEnabled(ReleaseToggle.TENANT_ADMIN_SETTINGS_EDIT),
                multitenancyWithSingleDomainEnabled: settings.multitenancyWithSingleDomainEnabled,
            }),
        [can, isEnabled, isSuperAdmin, settings.multitenancyWithSingleDomainEnabled, shouldShowThemeSettings],
    );

    return (
        <Page>
            <Page.Title titleKey="settings.title" subTitleKey="settings.title.text" tabs={tabs} />
            <Outlet />
        </Page>
    );
};
