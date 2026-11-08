import { Col, Row } from 'antd';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { TenantPermissionsSettings } from '../../../../components/Tenants/AppSettings/PermissionsSettings/TenantPermissionsSettings';
import { HintText } from '../../../../components/HintText';
import styles from './styles.module.scss';

export const TenantGlobalSettings = () => {
    const { id } = useParams<{ id: string }>();
    const { t } = useTranslation();

    return (
        <Row gutter={[24, 24]}>
            <Col span={24}>
                {/* A permanent explanation: plain text, no fill and no border (never a box in the page). */}
                <HintText title={t('tenants.globalSettings.superAdminWarning.title')}>
                    {t('tenants.globalSettings.superAdminWarning.description')}
                </HintText>
                <div className={styles.permissionsCardWrap}>
                    {/* ORISO-Admin#989: this page edits THIS Träger — its stored values and its
                        policies — not the platform-wide controls, which live under /settings. */}
                    <TenantPermissionsSettings tenantId={id || ''} excludeCardKeys={['liveChat']} />
                </div>
            </Col>
        </Row>
    );
};
