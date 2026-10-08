import { LegalSettings } from '../../../components/Tenants/LegalSettings';
import { useTenantData } from '../../../hooks/useTenantData.hook';
import { useUserRoles } from '../../../hooks/useUserRoles.hook';
import { resolveTenantId } from '../../../utils/resolveTenantId';

export const LegalSettingsPage = () => {
    const { data } = useTenantData();
    const { tenantId } = useUserRoles();
    // Two different ids on purpose. A platform administrator's token carries tenant 0, which has no
    // tenant row: the published platform imprint and privacy policy live on the main tenant loaded
    // for this domain, while TenantService owns the server-side platform DRAFT under tenant 0.
    const publishedTenantId = tenantId && Number(tenantId) > 0 ? tenantId : data?.id;
    const draftTenantId = resolveTenantId(tenantId, data?.id);
    return <LegalSettings tenantId={publishedTenantId} draftTenantId={draftTenantId} />;
};
