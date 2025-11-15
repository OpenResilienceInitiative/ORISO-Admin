import { Col, Row } from 'antd';
import { CommunicationSettings } from '../../../components/Tenants/AppSettings/CommunicationSettings';
import { NotificationsSettings } from '../../../components/Tenants/AppSettings/NotificationsSettings';
import { OtherFunctionsSettings } from '../../../components/Tenants/AppSettings/OtherFunctionsSettings';
import { useAppConfigContext } from '../../../context/useAppConfig';
import { UserRole } from '../../../enums/UserRole';
import { useTenantData } from '../../../hooks/useTenantData.hook';
import { useUserRoles } from '../../../hooks/useUserRoles.hook';

export const AppSettingsPage = () => {
    const { data } = useTenantData();
    const { hasRole } = useUserRoles();
    const { settings } = useAppConfigContext();

    if (settings.multitenancyWithSingleDomainEnabled && hasRole(UserRole.TenantAdmin)) {
        return (
            <Row gutter={[24, 24]}>
                <Col span={12} sm={6}>
                    <OtherFunctionsSettings tenantId={`${data.id}`} hideStatistics hideGroupChatToggle />
                </Col>
            </Row>
        );
    }

    return (
        <Row gutter={[24, 24]}>
            <Col span={12} sm={6}>
                <NotificationsSettings tenantId={`${data.id}`} />
            </Col>

            {hasRole(UserRole.TenantAdmin) && (
                <Col span={12} sm={6}>
                    {!settings.multitenancyWithSingleDomainEnabled && <CommunicationSettings tenantId={`${data.id}`} />}
                    <OtherFunctionsSettings tenantId={`${data.id}`} hideGroupChatToggle />
                </Col>
            )}
        </Row>
    );
};
