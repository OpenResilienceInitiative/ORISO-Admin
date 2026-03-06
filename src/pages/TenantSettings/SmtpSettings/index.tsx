import { useTenantData } from '../../../hooks/useTenantData.hook';
import { SmtpSettings } from '../../../components/Tenants/AppSettings/SmtpSettings';
import { useUserRoles } from '../../../hooks/useUserRoles.hook';

export const SmtpSettingsPage = () => {
    const { data } = useTenantData();
    const { tenantId } = useUserRoles();
    const resolvedTenantId = tenantId && tenantId > 0 ? tenantId : data?.id;
    return <SmtpSettings tenantId={`${resolvedTenantId || ''}`} />;
};
