import { Col, Row } from 'antd';
import { PermissionsSettings } from '../../../components/Tenants/AppSettings/PermissionsSettings';
import { useTenantData } from '../../../hooks/useTenantData.hook';

export const PermissionsSettingsPage = () => {
    const { data } = useTenantData();

    return (
        <Row gutter={[24, 24]}>
            <Col span={12} sm={6}>
                <PermissionsSettings tenantId={`${data.id}`} />
            </Col>
        </Row>
    );
};
