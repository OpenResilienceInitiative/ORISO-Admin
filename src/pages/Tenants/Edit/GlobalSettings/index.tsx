import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { TenantPermissionsSettings } from '../../../../components/Tenants/AppSettings/PermissionsSettings/TenantPermissionsSettings';
import styles from './styles.module.scss';

export const TenantGlobalSettings = () => {
    const { id } = useParams<{ id: string }>();
    const { t } = useTranslation();

    return (
        // A plain block: the antd Row gutter (-12px side margins) made the page 24px wider than its host, a 6px
        // horizontal scroll at 390.
        <div>
            <div className={styles.warningCard}>
                <strong>{t('tenants.globalSettings.superAdminWarning.title')}</strong>
                <p>{t('tenants.globalSettings.superAdminWarning.description')}</p>
            </div>
            <div className={styles.permissionsCardWrap}>
                {/* ORISO-Admin#989: this page edits THIS Träger — its stored values and its
                        policies — not the platform-wide controls, which live under /settings. */}
                <TenantPermissionsSettings tenantId={id || ''} excludeCardKeys={['liveChat']} />
            </div>
        </div>
    );
};
