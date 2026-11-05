import { FunctionalitiesGrid } from '../../../components/Tenants/AppSettings/FunctionalitiesGrid';
import { useAppConfigContext } from '../../../context/useAppConfig';
import { UserRole } from '../../../enums/UserRole';
import { useTenantData } from '../../../hooks/useTenantData.hook';
import { useUserRoles } from '../../../hooks/useUserRoles.hook';

export const AppSettingsPage = () => {
    const { data } = useTenantData();
    const { hasRole, tenantId } = useUserRoles();
    const { settings } = useAppConfigContext();
    const resolvedTenantId = `${(tenantId && tenantId > 0 ? tenantId : data?.id) || ''}`;

    if (!hasRole(UserRole.TenantAdmin)) {
        return null;
    }

    if (settings.multitenancyWithSingleDomainEnabled) {
        return (
            <FunctionalitiesGrid
                tenantId={resolvedTenantId}
                hideSmtp
                hideCommunication
                hideTopicsCard
                hideStatistics
                hideGroupChatToggle
            />
        );
    }

    return <FunctionalitiesGrid tenantId={resolvedTenantId} hideSmtp hideGroupChatToggle />;
};
