import { Col, Row } from 'antd';
import { PermissionAction } from '../../../enums/PermissionAction';
import { Resource } from '../../../enums/Resource';
import { useTenantData } from '../../../hooks/useTenantData.hook';
import { useUserPermissions } from '../../../hooks/useUserPermission';
import { Languages } from './components/Languages';
import { LogoAndFavicon } from './components/LogoAndFavicon';
import { NameAndSlogan } from './components/NameAndSlogan';
import { TenantColor } from './components/TenantColor';
import { TypeOfLanguage } from './components/TypeOfLanguage';

interface GeneralSettingsProps {
    tenantId?: string;
}

export const GeneralSettings = ({ tenantId }: GeneralSettingsProps) => {
    const { data } = useTenantData();
    const finalTenantId = tenantId || `${data?.id || ''}`;
    const { can } = useUserPermissions();

    return (
        <Row gutter={[24, 24]}>
            <Col span={12} sm={6}>
                <NameAndSlogan tenantId={finalTenantId} />
                {can(PermissionAction.Update, Resource.Language) && (
                    <>
                        <Languages tenantId={finalTenantId} />
                        <TypeOfLanguage tenantId={finalTenantId} />
                    </>
                )}
            </Col>
            <Col span={12} sm={6}>
                <LogoAndFavicon tenantId={finalTenantId} />
                <TenantColor tenantId={finalTenantId} />
            </Col>
        </Row>
    );
};
