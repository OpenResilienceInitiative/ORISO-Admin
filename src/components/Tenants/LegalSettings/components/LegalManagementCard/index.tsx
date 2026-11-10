import { useTranslation } from 'react-i18next';
import { CardEditable } from '../../../../CardEditable';
import { FormSwitchField } from '../../../../FormSwitchField';
import type { AppConfigInterface } from '../../../../../types/AppConfigInterface';
import styles from '../../styles.module.scss';

/** Single-domain only: whether each organisation looks after its own legal texts. Only platform admins edit this. */
export const LegalManagementCard = ({
    allowEdit,
    allowed,
    onSave,
}: {
    allowEdit: boolean;
    allowed?: boolean;
    onSave: (formData: Partial<AppConfigInterface>, options?: { onSuccess?: () => void; onError?: () => void }) => void;
}) => {
    const { t } = useTranslation();
    return (
        <CardEditable
            key={`legal-toggle-${allowed}`}
            allowEdit={allowEdit}
            // Only platform admins edit this: everyone else sees why the switch is locked.
            readOnlyAccess={!allowEdit}
            readOnlyHint={t('card.edit.readOnly.platformAdmin')}
            initialValues={{ legalContentChangesBySingleTenantAdminsAllowed: allowed }}
            titleKey="tenants.legal.singleTenantsManageLegal.title"
            variant="dialog"
            autoHeight
            editButtonPlacement="footer"
            onSave={onSave}
        >
            <div className={styles.checkGroup}>
                <p className={styles.checkInfo}>{t('tenants.legal.singleTenantsManageLegal.setting.description')}</p>
                <FormSwitchField
                    labelKey="tenants.legal.singleTenantsManageLegal.setting.title"
                    name={['legalContentChangesBySingleTenantAdminsAllowed']}
                    inline
                    disableLabels
                />
            </div>
        </CardEditable>
    );
};
