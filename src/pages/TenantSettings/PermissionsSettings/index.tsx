import { PermissionsSettings } from '../../../components/Tenants/AppSettings/PermissionsSettings';
import { useTenantData } from '../../../hooks/useTenantData.hook';
import { useUserRoles } from '../../../hooks/useUserRoles.hook';

export const PermissionsSettingsPage = () => {
    const { data } = useTenantData();
    const { tenantId, isSuperAdmin } = useUserRoles();
    const resolvedTenantId = tenantId && tenantId > 0 ? tenantId : data?.id;

    return (
        <PermissionsSettings
            tenantId={`${resolvedTenantId || ''}`}
            visibleToggles={data?.settings?.tenantAdminControls?.allowedPermissionToggles}
            superAdminControlMode={isSuperAdmin}
        />
    );
};
