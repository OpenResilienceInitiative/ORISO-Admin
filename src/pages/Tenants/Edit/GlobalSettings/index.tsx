import { Col, Row } from 'antd';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { TenantPermissionsSettings } from '../../../../components/Tenants/AppSettings/PermissionsSettings/TenantPermissionsSettings';
import styles from './styles.module.scss';

export const TenantGlobalSettings = () => {
    const { id } = useParams<{ id: string }>();
    const { t } = useTranslation();

    return (
        <Row gutter={[24, 24]}>
            <Col span={24}>
                <div className={styles.warningCard}>
                    <strong>{t('tenants.globalSettings.superAdminWarning.title')}</strong>
                    <p>{t('tenants.globalSettings.superAdminWarning.description')}</p>
                </div>
                <div className={styles.permissionsCardWrap}>
                    {/* ORISO-Admin#989: this page edits THIS Träger — its stored values and its
                        policies — not the platform-wide controls, which live under /settings. */}
                    <TenantPermissionsSettings tenantId={id || ''} excludeCardKeys={['liveChat']} />
                </div>
            </Col>
        </Row>
    );
};
