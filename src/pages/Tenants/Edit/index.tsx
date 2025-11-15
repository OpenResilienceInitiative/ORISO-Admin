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

export const TenantEditOrAdd = () => {
    const { settings } = useAppConfigContext();
    const { isEnabled } = useReleasesToggle();
    const { can } = useUserPermissions();
    const { search } = useLocation();
    const main = new URLSearchParams(search).get('main');
    const { id } = useParams<{ id: string }>();
    const isEditing = id !== 'add';

    const { data, isLoading } = useSingleTenantData({ id, enabled: isEditing });

    const newTitle = main ? 'tenants.add.mainTenant.headline' : 'tenants.add.headline';
    const title = isEditing ? data?.name : newTitle;

    const shouldAppearLegalTextTab =
        can(PermissionAction.Update, Resource.LegalText) &&
        (settings.legalContentChangesBySingleTenantAdminsAllowed || !settings.multitenancyWithSingleDomainEnabled);

    return (
        <Page isLoading={isLoading}>
            <Page.BackWithActions
                path={routePathNames.tenants}
                titleKey={title}
                tabs={
                    isEditing &&
                    can(PermissionAction.Update, Resource.Tenant) &&
                    isEnabled(ReleaseToggle.TENANT_ADMIN_SETTINGS_EDIT) && [
                        {
                            to: `/admin/tenants/${id}/general`,
                            titleKey: 'tenants.edit.tabs.general',
                        },
                        !settings.multitenancyWithSingleDomainEnabled && {
                            to: `/admin/tenants/${id}/theme-settings`,
                            titleKey: 'tenants.edit.tabs.themeSettings',
                        },
                        shouldAppearLegalTextTab && {
                            to: `/admin/tenants/${id}/legal-settings`,
                            titleKey: 'tenants.edit.tabs.legal',
                        },
                        {
                            to: `/admin/tenants/${id}/app-settings`,
                            titleKey: 'tenants.edit.tabs.appSettings',
                        },
                    ]
                }
            />
            <Outlet />
        </Page>
    );
};
