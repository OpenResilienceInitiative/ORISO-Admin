import { useParams } from 'react-router-dom';
import { CardGrid } from '../../../../components/CardGrid';
import { useAppConfigContext } from '../../../../context/useAppConfig';
import { UserRole } from '../../../../enums/UserRole';
import { useUserRoles } from '../../../../hooks/useUserRoles.hook';
import { CommunicationSettings } from '../../../../components/Tenants/AppSettings/CommunicationSettings';
import { OtherFunctionsSettings } from '../../../../components/Tenants/AppSettings/OtherFunctionsSettings';
import { SmtpSettings } from '../../../../components/Tenants/AppSettings/SmtpSettings';
import { TopicsSettings } from '../../../../components/Tenants/AppSettings/TopicsSettings';

export const TenantAppSettings = () => {
    const { id } = useParams<{ id: string }>();
    const { hasRole, isSuperAdmin } = useUserRoles();
    const { settings } = useAppConfigContext();
    const canSeeTenantAppSettings = isSuperAdmin || hasRole(UserRole.TenantAdmin);

    if (!canSeeTenantAppSettings) {
        return null;
    }

    return (
        <CardGrid raster>
            <CardGrid.Item span={3}>
                <SmtpSettings tenantId={id} />
            </CardGrid.Item>
            <CardGrid.Item>
                <CommunicationSettings tenantId={id} />
            </CardGrid.Item>
            <CardGrid.Item>
                <OtherFunctionsSettings tenantId={id} hideTopics={settings.multitenancyWithSingleDomainEnabled} />
            </CardGrid.Item>
            <CardGrid.Item>
                <TopicsSettings />
            </CardGrid.Item>
        </CardGrid>
    );
};
