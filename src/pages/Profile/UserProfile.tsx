import { Col, Row } from 'antd';
import { Page } from '../../components/Page';
import { useAppConfigContext } from '../../context/useAppConfig';
import { UserRole } from '../../enums/UserRole';
import { useUserRoles } from '../../hooks/useUserRoles.hook';
import { Documentation } from './Documentation';
import { LanguageSettings } from './LanguageSettings';
import { PasswordChange } from './PassswordChange';
import { PrivateData } from './PrivateData';

export const UserProfile = () => {
    const { settings } = useAppConfigContext();
    const { hasRole } = useUserRoles();

    return (
        <Page>
            <Page.Title titleKey="profile.title" subTitleKey="profile.title.text" />

            <Row gutter={[24, 24]}>
                <Col xs={24} sm={24} md={12} lg={8} xl={6}>
                    {!hasRole(UserRole.TenantAdmin) && <PrivateData />}
                    <LanguageSettings />
                    <PasswordChange />
                    {settings.documentationEnabled && <Documentation />}
                </Col>

                {/* 2FA disabled - Keycloak extension not implemented */}
                {/* <Col xs={24} sm={24} md={12} lg={8} xl={6}>
                    <Card titleKey="twoFactorAuth.title" subTitleKey="twoFactorAuth.subtitle">
                        <TwoFactorAuth />
                    </Card>
                </Col> */}
            </Row>
        </Page>
    );
};
