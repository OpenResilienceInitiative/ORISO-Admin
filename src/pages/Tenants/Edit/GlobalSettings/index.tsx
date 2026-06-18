import { Col, Row } from 'antd';
import { useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { PermissionsSettings } from '../../../../components/Tenants/AppSettings/PermissionsSettings';
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
                    <PermissionsSettings tenantId={id || ''} superAdminControlMode excludeCardKeys={['liveChat']} />
                </div>
            </Col>
        </Row>
    );
};
