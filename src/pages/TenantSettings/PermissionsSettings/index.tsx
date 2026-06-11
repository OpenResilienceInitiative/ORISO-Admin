import { PermissionsSettings } from '../../../components/Tenants/AppSettings/PermissionsSettings';
import { useUserRoles } from '../../../hooks/useUserRoles.hook';

export const PermissionsSettingsPage = () => {
    const { tenantId, isSuperAdmin } = useUserRoles();
    const resolvedTenantId = tenantId && tenantId > 0 ? `${tenantId}` : '';

    return <PermissionsSettings tenantId={resolvedTenantId} superAdminControlMode={isSuperAdmin} />;
};
