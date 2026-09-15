import { Alert, Col, Row } from 'antd';
import { useTranslation } from 'react-i18next';
import { Card } from '../../components/Card';
import { Page } from '../../components/Page';
import { useUserData } from '../../hooks/useUserData.hook';
import { TwoFactorSetup } from '../../components/TwoFactorSetup/TwoFactorSetup';

/**
 * Enrolment screen shown in place of the admin area (#891).
 *
 * There is deliberately no skip, no dismiss and no close: for tenant- and
 * agency-admins a second factor is mandatory, so the only ways out of this
 * screen are completing enrolment or logging out.
 */
export const MandatoryTwoFactorSetup = () => {
    const { t } = useTranslation();
    const { data: userData } = useUserData();
    const setupAvailable = userData?.twoFactorAuth?.isEnabled === true;

    return (
        <Page>
            {/* Empty: `Page.Title` drops titleKey/subTitleKey by design ("new design
                hides all page titles"), so the reason the admin is stuck has to be
                real content — see the alert below. Kept for the mobile-nav
                registration the header does. */}
            <Page.Title />
            <Row gutter={[24, 24]}>
                <Col xs={24} sm={24} md={16} lg={12} xl={8}>
                    <Alert
                        type={setupAvailable ? 'warning' : 'error'}
                        showIcon
                        message={t('twoFactorAuth.required.title')}
                        description={
                            setupAvailable
                                ? t('twoFactorAuth.required.subtitle')
                                : t('twoFactorAuth.required.unavailable')
                        }
                        className="mb-m"
                    />
                    <Card titleKey="twoFactorAuth.title" subTitleKey="twoFactorAuth.subtitle">
                        <TwoFactorSetup context="profile" required />
                    </Card>
                </Col>
            </Row>
        </Page>
    );
};
