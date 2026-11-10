import { ErstantwortSettings } from '../../../components/Tenants/AppSettings/ErstantwortSettings';
import { PermissionAction } from '../../../enums/PermissionAction';
import { Resource } from '../../../enums/Resource';
import { useTenantData } from '../../../hooks/useTenantData.hook';
import { useUserPermissions } from '../../../hooks/useUserPermission';
import { useUserRoles } from '../../../hooks/useUserRoles.hook';
import { resolveTenantId } from '../../../utils/resolveTenantId';

export const ErstantwortSettingsPage = () => {
    const { data } = useTenantData();
    const { tenantId } = useUserRoles();
    const { can } = useUserPermissions();
    // A tenant id of 0 (platform administrator) has no tenant row and must not be used as an explicit id.
    const explicitTenantId = tenantId && Number(tenantId) > 0 ? tenantId : undefined;
    const resolvedTenantId = resolveTenantId(explicitTenantId, data?.id);

    return (
        <ErstantwortSettings tenantId={resolvedTenantId} readOnly={!can(PermissionAction.Update, Resource.Tenant)} />
    );
};
