import { Outlet, useLocation, useParams } from 'react-router';
import { Page } from '../../../components/Page';
import routePathNames from '../../../appConfig';
import { useSingleTenantData } from '../../../hooks/useSingleTenantData';
import { PermissionAction } from '../../../enums/PermissionAction';
import { Resource } from '../../../enums/Resource';
import { useUserPermissions } from '../../../hooks/useUserPermission';
import { useReleasesToggle } from '../../../hooks/useReleasesToggle.hook';
import { ReleaseToggle } from '../../../enums/ReleaseToggle';
import { useAppConfigContext } from '../../../context/useAppConfig';
import { useUserRoles } from '../../../hooks/useUserRoles.hook';

export const TenantEditOrAdd = () => {
    const { settings } = useAppConfigContext();
    const { isEnabled } = useReleasesToggle();
    const { isSuperAdmin } = useUserRoles();
    const { can } = useUserPermissions();
    const { search } = useLocation();
    const main = new URLSearchParams(search).get('main');
    const { id } = useParams<{ id: string }>();
    const isEditing = id !== 'add';
    const canSeeTenantEditTabs = isEditing && can(PermissionAction.Update, Resource.Tenant);
    const canSeeConfigTabs = isEnabled(ReleaseToggle.TENANT_ADMIN_SETTINGS_EDIT) || isSuperAdmin;

    const { data, isLoading } = useSingleTenantData({ id, enabled: isEditing });

    const newTitle = main ? 'tenants.add.mainTenant.headline' : 'tenants.add.headline';
    const title = isEditing ? data?.name : newTitle;

    const shouldAppearLegalTextTab =
        can(PermissionAction.Read, Resource.LegalText) &&
        (isSuperAdmin ||
            settings.legalContentChangesBySingleTenantAdminsAllowed ||
            !settings.multitenancyWithSingleDomainEnabled);

    return (
        <Page isLoading={isLoading}>
            <Page.BackWithActions
                path={routePathNames.tenants}
                titleKey={title}
                tabs={
                    canSeeTenantEditTabs &&
                    canSeeConfigTabs && [
                        {
                            to: `/admin/tenants/${id}/general`,
                            titleKey: 'tenants.edit.tabs.general',
                            iconName: 'master_data',
                        },
                        !settings.multitenancyWithSingleDomainEnabled && {
                            to: `/admin/tenants/${id}/theme-settings`,
                            titleKey: 'tenants.edit.tabs.themeSettings',
                            iconName: 'appearance',
                        },
                        shouldAppearLegalTextTab && {
                            to: `/admin/tenants/${id}/legal-settings`,
                            titleKey: 'tenants.edit.tabs.legal',
                            iconName: 'legal',
                        },
                        {
                            to: `/admin/tenants/${id}/app-settings`,
                            titleKey: 'settings.subhead.smtp',
                            iconName: 'email_server',
                        },
                        isSuperAdmin && {
                            to: `/admin/tenants/${id}/global-settings`,
                            titleKey: 'settings.subhead.functionAccess',
                            iconName: 'functionality_access',
                        },
                    ]
                }
            />
            <Outlet />
        </Page>
    );
};
