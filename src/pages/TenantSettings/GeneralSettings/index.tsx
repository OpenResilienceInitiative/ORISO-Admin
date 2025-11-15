import { GeneralSettings } from '../../../components/Tenants/GeneralSettings';

export const GeneralSettingsPage = () => {
    // Use a default tenant ID since tenant endpoints don't exist
    return <GeneralSettings tenantId="1" />;
};
