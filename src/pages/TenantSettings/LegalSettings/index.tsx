import { LegalSettings } from '../../../components/Tenants/LegalSettings';
import { useTenantData } from '../../../hooks/useTenantData.hook';
import { useUserRoles } from '../../../hooks/useUserRoles.hook';
import { resolveTenantId } from '../../../utils/resolveTenantId';

export const LegalSettingsPage = () => {
    const { data } = useTenantData();
    const { tenantId } = useUserRoles();
    const resolvedTenantId = resolveTenantId(tenantId, data?.id);
    return <LegalSettings tenantId={resolvedTenantId} />;
};
