import { Col, Row } from 'antd';
import { CommunicationSettings } from '../../../components/Tenants/AppSettings/CommunicationSettings';
import { NotificationsSettings } from '../../../components/Tenants/AppSettings/NotificationsSettings';
import { OtherFunctionsSettings } from '../../../components/Tenants/AppSettings/OtherFunctionsSettings';
import { SmtpSettings } from '../../../components/Tenants/AppSettings/SmtpSettings';
import { useAppConfigContext } from '../../../context/useAppConfig';
import { UserRole } from '../../../enums/UserRole';
import { useTenantData } from '../../../hooks/useTenantData.hook';
import { useUserRoles } from '../../../hooks/useUserRoles.hook';

export const AppSettingsPage = () => {
    const { data } = useTenantData();
    const { hasRole, tenantId } = useUserRoles();
    const { settings } = useAppConfigContext();
    const resolvedTenantId = tenantId && tenantId > 0 ? tenantId : data?.id;

    if (settings.multitenancyWithSingleDomainEnabled && hasRole(UserRole.TenantAdmin)) {
        return (
            <Row gutter={[24, 24]}>
                <Col span={12} sm={6}>
                    <OtherFunctionsSettings tenantId={`${resolvedTenantId || ''}`} hideStatistics hideGroupChatToggle />
                </Col>
            </Row>
        );
    }

    return (
        <Row gutter={[24, 24]}>
            <Col span={12} sm={6}>
                <NotificationsSettings tenantId={`${resolvedTenantId || ''}`} />
            </Col>

            {hasRole(UserRole.TenantAdmin) && (
                <Col span={12} sm={6}>
                    <SmtpSettings tenantId={`${resolvedTenantId || ''}`} />
                    {!settings.multitenancyWithSingleDomainEnabled && (
                        <CommunicationSettings tenantId={`${resolvedTenantId || ''}`} />
                    )}
                    <OtherFunctionsSettings tenantId={`${resolvedTenantId || ''}`} hideGroupChatToggle />
                </Col>
            )}
        </Row>
    );
};
