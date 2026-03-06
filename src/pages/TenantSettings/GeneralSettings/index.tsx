import { GeneralSettings } from '../../../components/Tenants/GeneralSettings';
import { useTenantData } from '../../../hooks/useTenantData.hook';
import { useUserRoles } from '../../../hooks/useUserRoles.hook';

export const GeneralSettingsPage = () => {
    const { data } = useTenantData();
    const { tenantId } = useUserRoles();
    const resolvedTenantId = tenantId && tenantId > 0 ? tenantId : data?.id;

    return <GeneralSettings tenantId={`${resolvedTenantId || ''}`} />;
};
