import { useTranslation } from 'react-i18next';
import { CardEditable } from '../../../CardEditable';
import { FormSwitchField } from '../../../FormSwitchField';
import { useSingleTenantData } from '../../../../hooks/useSingleTenantData';
import { useTenantAdminDataMutation } from '../../../../hooks/useTenantAdminDataMutation.hook';
import styles from './styles.module.scss';

interface PermissionsSettingsArgs {
    tenantId: string;
}

export const PermissionsSettings = ({ tenantId }: PermissionsSettingsArgs) => {
    const { t } = useTranslation();
    const { data, isLoading } = useSingleTenantData({ id: tenantId });
    const { mutate } = useTenantAdminDataMutation({
        id: tenantId,
        successMessageKey: 'tenants.message.settingsUpdate',
    });

    const initialValues = {
        ...data,
        settings: {
            featureAnonymousChatEnabled: true,
            featureCallsEnabled: true,
            ...(data?.settings ?? {}),
        },
    };

    return (
        <CardEditable
            isLoading={isLoading}
            initialValues={initialValues}
            titleKey="tenants.permissions.title"
            onSave={mutate}
        >
            <div className={styles.checkGroup}>
                <FormSwitchField
                    labelKey="tenants.permissions.anonymousChat.title"
                    name={['settings', 'featureAnonymousChatEnabled']}
                    inline
                    disableLabels
                />
                <p className={styles.checkInfo}>{t('tenants.permissions.anonymousChat.description')}</p>
            </div>
            <div className={styles.checkGroup}>
                <FormSwitchField
                    labelKey="tenants.permissions.calls.title"
                    name={['settings', 'featureCallsEnabled']}
                    inline
                    disableLabels
                />
                <p className={styles.checkInfo}>{t('tenants.permissions.calls.description')}</p>
            </div>
        </CardEditable>
    );
};
