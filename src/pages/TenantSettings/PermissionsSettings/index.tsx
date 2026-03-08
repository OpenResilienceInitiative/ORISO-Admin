import { Col, Row } from 'antd';
import { PermissionsSettings } from '../../../components/Tenants/AppSettings/PermissionsSettings';
import { useTenantData } from '../../../hooks/useTenantData.hook';
import { useUserRoles } from '../../../hooks/useUserRoles.hook';

export const PermissionsSettingsPage = () => {
    const { data } = useTenantData();
    const { tenantId } = useUserRoles();
    const resolvedTenantId = tenantId && tenantId > 0 ? tenantId : data?.id;

    return (
        <Row gutter={[24, 24]}>
            <Col span={12} sm={6}>
                <PermissionsSettings tenantId={`${resolvedTenantId || ''}`} />
            </Col>
        </Row>
    );
};
