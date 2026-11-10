import { Col, Row } from 'antd';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card } from '../../../../components/Card';
import { LiveChatLinks } from '../../../../components/LiveChatLinks';
import { TenantPermissionsSettings } from '../../../../components/Tenants/AppSettings/PermissionsSettings/TenantPermissionsSettings';
import { HintText } from '../../../../components/HintText';
import styles from './styles.module.scss';

export const TenantGlobalSettings = () => {
    const { id } = useParams<{ id: string }>();
    const { t } = useTranslation();
    const tenantId = Number(id);

    return (
        // No horizontal gutter: its negative side margins made the page 12px wider than its host (a sideways scroll).
        <Row gutter={[0, 24]}>
            <Col span={24}>
                {/* A permanent explanation: plain text, no fill and no border (never a box in the page). */}
                <HintText title={t('tenants.globalSettings.superAdminWarning.title')}>
                    {t('tenants.globalSettings.superAdminWarning.description')}
                </HintText>
                {Number.isSafeInteger(tenantId) && tenantId > 0 && (
                    <Card titleKey="liveChatLinks.title">
                        <LiveChatLinks key={tenantId} mode="manage" tenantId={tenantId} />
                    </Card>
                )}
                <div className={styles.permissionsCardWrap}>
                    {/* ORISO-Admin#989: this page edits THIS Träger — its stored values and its
                        policies — not the platform-wide controls, which live under /settings. */}
                    <TenantPermissionsSettings tenantId={id || ''} excludeCardKeys={['liveChat']} />
                </div>
            </Col>
        </Row>
    );
};
