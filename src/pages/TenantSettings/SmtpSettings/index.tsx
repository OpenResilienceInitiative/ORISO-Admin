import { useTenantData } from '../../../hooks/useTenantData.hook';
import { SmtpSettings } from '../../../components/Tenants/AppSettings/SmtpSettings';

export const SmtpSettingsPage = () => {
    const { data } = useTenantData();
    return <SmtpSettings tenantId={`${data?.id || 1}`} />;
};
