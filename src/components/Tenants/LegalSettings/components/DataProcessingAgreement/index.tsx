import { useTranslation } from 'react-i18next';
import { Card } from '../../../../Card';
import { useAppConfigContext } from '../../../../../context/useAppConfig';
import styles from './styles.module.scss';

/**
 * Placeholder module for the data processing agreement (Auftragsdatenverarbeitung).
 * The actual agreement text and flow are implemented in a later step — the module
 * is already visible everywhere so admins can see that it exists, per the rule
 * "never hide, only disable".
 */
export const DataProcessingAgreement = () => {
    const { t } = useTranslation();
    const { settings } = useAppConfigContext();
    const isActive = settings?.legalContentChangesBySingleTenantAdminsAllowed;

    return (
        <Card titleKey="tenants.legal.dataProcessingAgreement.title" className={styles.card}>
            <p className={styles.description}>{t('tenants.legal.dataProcessingAgreement.description')}</p>
            <p className={styles.status}>
                {t(
                    isActive
                        ? 'tenants.legal.dataProcessingAgreement.status.active'
                        : 'tenants.legal.dataProcessingAgreement.status.inactive',
                )}
            </p>
        </Card>
    );
};
