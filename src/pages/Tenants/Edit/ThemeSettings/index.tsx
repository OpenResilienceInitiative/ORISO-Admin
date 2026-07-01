import { useParams } from 'react-router-dom';
import { GeneralSettings } from '../../../../components/Tenants/GeneralSettings';

export const TenantThemeSettings = () => {
    const { id } = useParams();

    return <GeneralSettings tenantId={id} />;
};
