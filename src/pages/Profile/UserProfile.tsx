import { Col, Row } from 'antd';
import { Card } from '../../components/Card';
import { Page } from '../../components/Page';
import { useAppConfigContext } from '../../context/useAppConfig';
import { UserRole } from '../../enums/UserRole';
import { useUserRoles } from '../../hooks/useUserRoles.hook';
import { Documentation } from './Documentation';
import { PasswordChange } from './PassswordChange';
import { PrivateData } from './PrivateData';
import TwoFactorAuth from './TwoFactorAuth/TwoFactorAuth';

export const UserProfile = () => {
    const { settings } = useAppConfigContext();
    const { hasRole } = useUserRoles();

    return (
        <Page>
            <Page.Title titleKey="profile.title" subTitleKey="profile.title.text" />

            <Row gutter={[24, 24]}>
                <Col span={12} md={6}>
                    {!hasRole(UserRole.TenantAdmin) && <PrivateData />}
                    <PasswordChange />
                    {settings.documentationEnabled && <Documentation />}
                </Col>

                {/* 2FA disabled - Keycloak extension not implemented */}
                {/* <Col span={12} md={6}>
                    <Card titleKey="twoFactorAuth.title" subTitleKey="twoFactorAuth.subtitle">
                        <TwoFactorAuth />
                    </Card>
                </Col> */}
            </Row>
        </Page>
    );
};
