import { Alert, Button, Col, Row, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { Card } from '../../components/Card';
import { Page } from '../../components/Page';
import { useUserData } from '../../hooks/useUserData.hook';
import { TwoFactorSetup } from '../../components/TwoFactorSetup/TwoFactorSetup';

const { Paragraph } = Typography;

interface MandatoryTwoFactorSetupProps {
    // When provided, the admin can leave the prompt and set 2FA up later.
    onSkip?: () => void;
}

export const MandatoryTwoFactorSetup = ({ onSkip }: MandatoryTwoFactorSetupProps) => {
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
                        <TwoFactorSetup context="profile" required />
                    </Card>
                    {onSkip && (
                        <div className="mt-m">
                            <Button type="link" onClick={onSkip} data-cy="two-factor-skip">
                                {t('twoFactorAuth.required.skip')}
                            </Button>
                            <Paragraph type="secondary">{t('twoFactorAuth.required.skipHint')}</Paragraph>
                        </div>
                    )}
                </Col>
            </Row>
        </Page>
    );
};
