import { Alert, Col, Row } from 'antd';
import { useTranslation } from 'react-i18next';
import { Card } from '../../components/Card';
import { Page } from '../../components/Page';
import { useUserData } from '../../hooks/useUserData.hook';
import TwoFactorAuth from './TwoFactorAuth/TwoFactorAuth';

export const MandatoryTwoFactorSetup = () => {
    const { t } = useTranslation();
    const { data: userData } = useUserData();
    const setupAvailable = userData?.twoFactorAuth?.isEnabled === true;

    return (
        <Page>
            <Page.Title titleKey="twoFactorAuth.required.title" subTitleKey="twoFactorAuth.required.subtitle" />
            <Row gutter={[24, 24]}>
                <Col xs={24} sm={24} md={16} lg={12} xl={8}>
                    {!setupAvailable && (
                        <Alert
                            type="error"
                            showIcon
                            message={t('twoFactorAuth.required.unavailable')}
                            className="mb-m"
                        />
                    )}
                    <Card titleKey="twoFactorAuth.title" subTitleKey="twoFactorAuth.subtitle">
                        <TwoFactorAuth required />
                    </Card>
                </Col>
            </Row>
        </Page>
    );
};
