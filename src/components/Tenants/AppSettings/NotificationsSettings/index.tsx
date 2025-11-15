import { Divider } from 'antd';
import { useTranslation } from 'react-i18next';
import { CardEditable } from '../../../CardEditable';
import { FormRadioGroupField } from '../../../FormRadioGroupField';
import { FormSwitchField } from '../../../FormSwitchField';
import { useSingleTenantData } from '../../../../hooks/useSingleTenantData';
import { useTenantAdminDataMutation } from '../../../../hooks/useTenantAdminDataMutation.hook';
import styles from './styles.module.scss';

export const NotificationsSettings = ({ tenantId }: { tenantId: string }) => {
    const { t } = useTranslation();
    const { data, isLoading } = useSingleTenantData({ id: tenantId });
    const { mutate } = useTenantAdminDataMutation({
        id: tenantId,
        successMessageKey: 'tenants.message.settingsUpdate24Hours',
    });

    return (
        <CardEditable
            isLoading={isLoading}
            initialValues={{ ...data }}
            titleKey="tenants.appSettings.notifications.title"
            onSave={mutate}
        >
            <div className={styles.checkGroup}>
                <FormSwitchField
                    labelKey="tenants.appSettings.welcomeMessage.label"
                    name={['settings', 'extendedSettings', 'welcomeMessage', 'sendWelcomeMessage']}
                    inline
                    disableLabels
                />
                <p className={styles.checkInfo}>{t('tenants.appSettings.welcomeMessage.description')}</p>
            </div>
            <div className={styles.checkGroup}>
                <FormSwitchField
                    labelKey="tenants.appSettings.nextSteps.label"
                    name={['settings', 'extendedSettings', 'sendFurtherStepsMessage']}
                    inline
                    disableLabels
                />
                <p className={styles.checkInfo}>{t('tenants.appSettings.nextSteps.description')}</p>
            </div>
            {/* <div className={styles.checkGroup}>
                <FormSwitchField
                    labelKey="tenants.appSettings.sessionData.label"
                    name={['settings', 'extendedSettings', 'sendSaveSessionDataMessage']}
                    inline
                    disableLabels
                />
            </div> */}
            <Divider />
            <div className={styles.radioGroup}>
                <FormRadioGroupField
                    vertical
                    labelKey="tenants.appSettings.notifications.info"
                    name={[
                        'settings',
                        'extendedSettings',
                        'notifications',
                        'teamSessions',
                        'newMessage',
                        'allTeamConsultants',
                    ]}
                    className={styles.notifications}
                >
                    <FormRadioGroupField.Radio value={false}>
                        {t('tenants.appSettings.notifications.option.onlyConsultant')}
                    </FormRadioGroupField.Radio>
                    <FormRadioGroupField.Radio value>
                        {t('tenants.appSettings.notifications.option.allTeamConsultants')}
                    </FormRadioGroupField.Radio>
                </FormRadioGroupField>
            </div>
        </CardEditable>
    );
};
