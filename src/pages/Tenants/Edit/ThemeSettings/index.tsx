import { useParams } from 'react-router';
import { GeneralSettings } from '../../../../components/Tenants/GeneralSettings';

export const TenantThemeSettings = () => {
    const { id } = useParams();

    return <GeneralSettings tenantId={id} />;
};
