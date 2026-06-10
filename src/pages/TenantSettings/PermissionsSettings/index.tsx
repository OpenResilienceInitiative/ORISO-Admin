import { PermissionsSettings } from '../../../components/Tenants/AppSettings/PermissionsSettings';
import { usePublicTenantData } from '../../../hooks/usePublicTenantData.hook';
import { useUserRoles } from '../../../hooks/useUserRoles.hook';

export const PermissionsSettingsPage = () => {
    const { data } = usePublicTenantData();
    const { tenantId, isSuperAdmin } = useUserRoles();
    const resolvedTenantId = tenantId && tenantId > 0 ? tenantId : data?.id;

    return (
        <PermissionsSettings
            tenantId={`${resolvedTenantId || ''}`}
            visibleToggles={data?.settings}
            superAdminControlMode={isSuperAdmin}
        />
    );
};
