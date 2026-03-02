import { Card } from 'antd';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { CardEditable } from '../../../CardEditable';
import { FormSwitchField } from '../../../FormSwitchField';
import { FormInputField } from '../../../FormInputField';
import { FormInputNumberField } from '../../../FormInputNumberField';
import { FormInputPasswordField } from '../../../FormInputPasswordField';
import { useSingleTenantData } from '../../../../hooks/useSingleTenantData';
import { useTenantAdminDataMutation } from '../../../../hooks/useTenantAdminDataMutation.hook';
import styles from './styles.module.scss';

const DEFAULT_SMTP_SETTINGS = {
    featureSystemNotificationEmailsEnabled: false,
    smtp: {
        enabled: false,
        host: '',
        port: 587,
        secure: false,
        username: '',
        password: '',
        from: '',
    },
} as const;

export const SmtpSettings = ({ tenantId }: { tenantId: string }) => {
    const { t } = useTranslation();
    const { data, isLoading } = useSingleTenantData({ id: tenantId });
    const { mutate } = useTenantAdminDataMutation({
        id: tenantId,
        successMessageKey: 'tenants.message.settingsUpdate',
    });
    const initialValues = useMemo(
        () => ({
            ...data,
            settings: {
                ...DEFAULT_SMTP_SETTINGS,
                ...(data?.settings ?? {}),
                smtp: {
                    ...DEFAULT_SMTP_SETTINGS.smtp,
                    ...(data?.settings?.smtp ?? {}),
                },
            },
        }),
        [data]
    );

    return (
        <CardEditable
            isLoading={isLoading}
            initialValues={initialValues}
            titleKey="tenants.appSettings.smtp.title"
            onSave={mutate}
        >
            <Card className={styles.sectionCard} size="small" bordered>
                <div className={styles.checkGroup}>
                    <FormSwitchField
                        labelKey="tenants.appSettings.smtp.systemEmailToggle.title"
                        name={['settings', 'featureSystemNotificationEmailsEnabled']}
                        inline
                        disableLabels
                    />
                    <p className={styles.checkInfo}>{t('tenants.appSettings.smtp.systemEmailToggle.description')}</p>
                </div>

                <div className={styles.checkGroup}>
                    <FormSwitchField
                        labelKey="tenants.appSettings.smtp.smtpToggle.title"
                        name={['settings', 'smtp', 'enabled']}
                        inline
                        disableLabels
                    />
                    <p className={styles.checkInfo}>{t('tenants.appSettings.smtp.smtpToggle.description')}</p>
                </div>

                <div className={styles.fieldGrid}>
                    <FormInputField labelKey="tenants.appSettings.smtp.host" name={['settings', 'smtp', 'host']} />
                    <FormInputNumberField
                        labelKey="tenants.appSettings.smtp.port"
                        name={['settings', 'smtp', 'port']}
                        min={1}
                        max={65535}
                    />
                    <FormInputField
                        labelKey="tenants.appSettings.smtp.username"
                        name={['settings', 'smtp', 'username']}
                    />
                    <FormInputPasswordField
                        labelKey="tenants.appSettings.smtp.password"
                        name={['settings', 'smtp', 'password']}
                    />
                    <FormInputField labelKey="tenants.appSettings.smtp.from" name={['settings', 'smtp', 'from']} />
                    <FormSwitchField
                        labelKey="tenants.appSettings.smtp.secure"
                        name={['settings', 'smtp', 'secure']}
                        inline
                        disableLabels
                    />
                </div>
            </Card>
        </CardEditable>
    );
};
