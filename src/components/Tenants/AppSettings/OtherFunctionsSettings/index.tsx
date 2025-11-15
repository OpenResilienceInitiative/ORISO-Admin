import { useTranslation } from 'react-i18next';
import { CardEditable } from '../../../CardEditable';
import { FormSwitchField } from '../../../FormSwitchField';
import { useSingleTenantData } from '../../../../hooks/useSingleTenantData';
import { useTenantAdminDataMutation } from '../../../../hooks/useTenantAdminDataMutation.hook';
import styles from './styles.module.scss';
import { useAppConfigContext } from '../../../../context/useAppConfig';

interface OtherFunctionsSettingsArgs {
    tenantId: string;
    hideTopics?: boolean;
    hideStatistics?: boolean;
    hideGroupChatToggle?: boolean;
}

export const OtherFunctionsSettings = ({
    tenantId,
    hideTopics,
    hideStatistics,
    hideGroupChatToggle,
}: OtherFunctionsSettingsArgs) => {
    const { t } = useTranslation();
    const { settings } = useAppConfigContext();
    const { data, isLoading } = useSingleTenantData({ id: tenantId });
    const { mutate } = useTenantAdminDataMutation({
        id: tenantId,
        successMessageKey: 'tenants.message.settingsUpdate',
    });
    const extraI18nTopicKey = settings.multitenancyWithSingleDomainEnabled ? '.mtsd' : '';
    return (
        <CardEditable
            isLoading={isLoading}
            initialValues={{ ...data }}
            titleKey="tenants.appSettings.otherFunctions.title"
            onSave={mutate}
        >
            {!hideTopics && (
                <div className={styles.checkGroup}>
                    <FormSwitchField
                        labelKey={`tenants.appSettings.otherFunctions${extraI18nTopicKey}.allowTopicCreation.title`}
                        name={['settings', 'featureTopicsEnabled']}
                        inline
                        disableLabels
                    />
                    <p className={styles.checkInfo}>
                        {t(`tenants.appSettings.otherFunctions${extraI18nTopicKey}.allowTopicCreation.description`)}
                    </p>
                </div>
            )}
            {!hideStatistics && (
                <div className={styles.checkGroup}>
                    <FormSwitchField
                        labelKey="tenants.appSettings.otherFunctions.statistics.title"
                        name={['settings', 'featureStatisticsEnabled']}
                        inline
                        disableLabels
                    />
                    <p className={styles.checkInfo}>{t('tenants.appSettings.otherFunctions.statistics.description')}</p>
                </div>
            )}
            {!hideGroupChatToggle && (
                <div className={styles.checkGroup}>
                    <FormSwitchField
                        labelKey="tenants.appSettings.otherFunctions.groupChat.title"
                        name={['settings', 'featureGroupChatV2Enabled']}
                        inline
                        disableLabels
                    />
                    <p className={styles.checkInfo}>{t('tenants.appSettings.otherFunctions.groupChat.description')}</p>
                </div>
            )}
        </CardEditable>
    );
};
