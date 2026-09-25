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
import { PermissionAction } from '../../enums/PermissionAction';
import { Resource } from '../../enums/Resource';
import { useHasUnreadLegalProposals } from '../../components/Tenants/LegalSettings/hooks/useLegalProposalInbox';
import { LegalTemplateUnreadMarker } from '../../components/Tenants/LegalSettings/components/LegalTemplateCompare/LegalTemplateUnreadMarker';

export const TenantSettingsLayout = () => {
    const { settings } = useAppConfigContext();
    const { hasRole, isSuperAdmin, isTenantScopedAdmin, tenantId } = useUserRoles();
    const { can } = useUserPermissions();
    const { isEnabled } = useReleasesToggle();
    const shouldShowThemeSettings =
        (settings.multitenancyWithSingleDomainEnabled && hasRole(UserRole.TenantAdmin)) ||
        (!settings.multitenancyWithSingleDomainEnabled && hasRole(UserRole.SingleTenantAdmin));

    // A Träger admin learns on the tab that the platform sent a legal template (#1070).
    const hasNewLegalTemplate = useHasUnreadLegalProposals(
        'tenant',
        tenantId,
        isTenantScopedAdmin && can(PermissionAction.Read, Resource.LegalText),
    );

    const tabs = useMemo(
        () =>
            getSettingsTabs({
                isSuperAdmin,
                shouldShowThemeSettings,
                can,
                isTenantSettingsEditEnabled: isEnabled(ReleaseToggle.TENANT_ADMIN_SETTINGS_EDIT),
                multitenancyWithSingleDomainEnabled: settings.multitenancyWithSingleDomainEnabled,
            }).map((tab) =>
                hasNewLegalTemplate && tab.to.endsWith('/legal')
                    ? { ...tab, icon: <LegalTemplateUnreadMarker /> }
                    : tab,
            ),
        [
            can,
            hasNewLegalTemplate,
            isEnabled,
            isSuperAdmin,
            settings.multitenancyWithSingleDomainEnabled,
            shouldShowThemeSettings,
        ],
    );

    return (
        <Page>
            <Page.Title titleKey="settings.title" subTitleKey="settings.title.text" tabs={tabs} />
            <Outlet />
        </Page>
    );
};
