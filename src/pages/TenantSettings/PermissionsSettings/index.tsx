import { PermissionsSettings } from '../../../components/Tenants/AppSettings/PermissionsSettings';
import { useTenantData } from '../../../hooks/useTenantData.hook';
import { useUserRoles } from '../../../hooks/useUserRoles.hook';

export const PermissionsSettingsPage = () => {
    const { data } = useTenantData();
    const { tenantId, isSuperAdmin } = useUserRoles();
    const resolvedTenantId = tenantId && tenantId > 0 ? tenantId : data?.id;
    const controls = data?.settings?.tenantAdminControls;
    const inheritedVisibleToggles = isSuperAdmin
        ? undefined
        : {
              ...(controls?.allowedPermissionToggles || {}),
              anonymousChat: false,
          };

    return (
        <PermissionsSettings
            tenantId={`${resolvedTenantId || ''}`}
            visibleToggles={inheritedVisibleToggles}
            superAdminControlMode={isSuperAdmin}
        />
    );
};
