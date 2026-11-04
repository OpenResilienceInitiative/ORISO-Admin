import { useParams } from 'react-router-dom';
import { ErstantwortSettings } from '../../../../components/Tenants/AppSettings/ErstantwortSettings';
import { PermissionAction } from '../../../../enums/PermissionAction';
import { Resource } from '../../../../enums/Resource';
import { useUserPermissions } from '../../../../hooks/useUserPermission';

/** The Erstantwort texts of the Träger named in the route (the Träger admin's own copy is under /settings). */
export const TenantErstantwortSettings = () => {
    const { id } = useParams<{ id: string }>();
    const { can } = useUserPermissions();

    return <ErstantwortSettings tenantId={id || ''} readOnly={!can(PermissionAction.Update, Resource.Tenant)} />;
};
