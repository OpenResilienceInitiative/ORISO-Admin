import { LegalSettings } from '../../../components/Tenants/LegalSettings';
import { useTenantData } from '../../../hooks/useTenantData.hook';

export const LegalSettingsPage = () => {
    const { data } = useTenantData();
    return <LegalSettings tenantId={data?.id} />;
};
