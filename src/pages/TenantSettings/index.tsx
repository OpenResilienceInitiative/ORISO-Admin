import { Outlet } from 'react-router';
import { Page } from '../../components/Page';
import { useAppConfigContext } from '../../context/useAppConfig';
import { PermissionAction } from '../../enums/PermissionAction';
import { ReleaseToggle } from '../../enums/ReleaseToggle';
import { Resource } from '../../enums/Resource';
import { UserRole } from '../../enums/UserRole';
import { useReleasesToggle } from '../../hooks/useReleasesToggle.hook';
import { useUserPermissions } from '../../hooks/useUserPermission';
import { useUserRoles } from '../../hooks/useUserRoles.hook';

export const TenantSettingsLayout = () => {
    const { settings } = useAppConfigContext();
    const { hasRole } = useUserRoles();
    const { can } = useUserPermissions();
    const { isEnabled } = useReleasesToggle();
    const shouldShowThemeSettings =
        (settings.multitenancyWithSingleDomainEnabled && hasRole(UserRole.TenantAdmin)) ||
        (!settings.multitenancyWithSingleDomainEnabled && hasRole(UserRole.SingleTenantAdmin));

    return (
        <Page>
            <Page.Title
                titleKey="settings.title"
                subTitleKey="settings.title.text"
                tabs={[
                    shouldShowThemeSettings &&
                        can(PermissionAction.Update, Resource.Tenant) && {
                            to: '/admin/theme-settings/general',
                            titleKey: 'settings.subhead.view',
                        },
                    can(PermissionAction.Update, Resource.LegalText) && {
                        to: '/admin/theme-settings/legal',
                        titleKey: 'settings.subhead.legal',
                    },
                    can(PermissionAction.Update, Resource.Tenant) &&
                        isEnabled(ReleaseToggle.TENANT_ADMIN_SETTINGS_EDIT) && {
                            to: '/admin/theme-settings/app-settings',
                            titleKey: `tenants.edit.tabs.${
                                settings.multitenancyWithSingleDomainEnabled ? 'globalSettings' : 'appSettings'
                            }`,
                        },
                ]}
            />
            <Outlet />
        </Page>
    );
};
