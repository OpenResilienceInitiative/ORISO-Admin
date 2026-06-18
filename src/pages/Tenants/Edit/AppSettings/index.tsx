import { Col, Row } from 'antd';
import { useParams } from 'react-router';
import { useAppConfigContext } from '../../../../context/useAppConfig';
import { UserRole } from '../../../../enums/UserRole';
import { useUserRoles } from '../../../../hooks/useUserRoles.hook';
import { CommunicationSettings } from '../../../../components/Tenants/AppSettings/CommunicationSettings';
import { OtherFunctionsSettings } from '../../../../components/Tenants/AppSettings/OtherFunctionsSettings';
import { SmtpSettings } from '../../../../components/Tenants/AppSettings/SmtpSettings';

export const TenantAppSettings = () => {
    const { id } = useParams<{ id: string }>();
    const { hasRole, isSuperAdmin } = useUserRoles();
    const { settings } = useAppConfigContext();
    const canSeeTenantAppSettings = isSuperAdmin || hasRole(UserRole.TenantAdmin);

    return (
        <Row gutter={[24, 24]}>
            {canSeeTenantAppSettings && (
                <Col span={12} sm={6}>
                    <SmtpSettings tenantId={id} />
                    <CommunicationSettings tenantId={id} />
                    <OtherFunctionsSettings tenantId={id} hideTopics={settings.multitenancyWithSingleDomainEnabled} />
                </Col>
            )}
        </Row>
    );
};
