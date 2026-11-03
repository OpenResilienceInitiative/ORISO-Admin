import { useParams } from 'react-router-dom';
import { FunctionalitiesGrid } from '../../../../components/Tenants/AppSettings/FunctionalitiesGrid';
import { UserRole } from '../../../../enums/UserRole';
import { useUserRoles } from '../../../../hooks/useUserRoles.hook';

export const TenantAppSettings = () => {
    const { id } = useParams<{ id: string }>();
    const { hasRole, isSuperAdmin } = useUserRoles();
    const canSeeTenantAppSettings = isSuperAdmin || hasRole(UserRole.TenantAdmin);

    if (!canSeeTenantAppSettings) {
        return null;
    }

    return <FunctionalitiesGrid tenantId={id ?? ''} hideSmtp />;
};
