import { Card } from 'antd';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { CardEditable } from '../../../CardEditable';
import { FormSwitchField } from '../../../FormSwitchField';
import { FormInputField } from '../../../FormInputField';
import { FormInputNumberField } from '../../../FormInputNumberField';
import { FormInputPasswordField } from '../../../FormInputPasswordField';
import { FormColorSelectorField } from '../../../FormColorSelectorField';
import { useAppConfigContext } from '../../../../context/useAppConfig';
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
        emailThemeColor: '#0f3b8f',
    },
} as const;

export const SmtpSettings = ({ tenantId }: { tenantId: string }) => {
    const { t } = useTranslation();
    const { settings } = useAppConfigContext();
    const { data, isLoading } = useSingleTenantData({ id: tenantId });
    const { mutate } = useTenantAdminDataMutation({
        id: tenantId,
        successMessageKey: 'tenants.message.settingsUpdate',
    });
    const systemEmailsAllowed = settings.globalFeatureSystemNotificationEmailsEnabled !== false;
    const smtpAllowed = settings.globalSmtpEnabled !== false;
    const applyPlatformEmailRestrictions = useCallback(
        (formData) => ({
            ...formData,
            settings: {
                ...(formData?.settings ?? {}),
                featureSystemNotificationEmailsEnabled: systemEmailsAllowed
                    ? formData?.settings?.featureSystemNotificationEmailsEnabled
                    : false,
                smtp: {
                    ...(formData?.settings?.smtp ?? {}),
                    enabled: smtpAllowed ? formData?.settings?.smtp?.enabled : false,
                },
            },
        }),
        [smtpAllowed, systemEmailsAllowed],
    );
    const initialValues = useMemo(
        () =>
            applyPlatformEmailRestrictions({
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
        [applyPlatformEmailRestrictions, data],
    );

    return (
        <CardEditable
            key={`smtp-${systemEmailsAllowed}-${smtpAllowed}`}
            isLoading={isLoading}
            initialValues={initialValues}
            titleKey="tenants.appSettings.smtp.title"
            onSave={(formData) => mutate(applyPlatformEmailRestrictions(formData))}
        >
            <Card className={styles.sectionCard} size="small" bordered>
                <div className={styles.checkGroup}>
                    <FormSwitchField
                        labelKey="tenants.appSettings.smtp.systemEmailToggle.title"
                        name={['settings', 'featureSystemNotificationEmailsEnabled']}
                        inline
                        disableLabels
                        disabled={!systemEmailsAllowed}
                    />
                    <p className={styles.checkInfo}>{t('tenants.appSettings.smtp.systemEmailToggle.description')}</p>
                </div>

                <div className={styles.checkGroup}>
                    <FormSwitchField
                        labelKey="tenants.appSettings.smtp.smtpToggle.title"
                        name={['settings', 'smtp', 'enabled']}
                        inline
                        disableLabels
                        disabled={!smtpAllowed}
                    />
                    <p className={styles.checkInfo}>{t('tenants.appSettings.smtp.smtpToggle.description')}</p>
                </div>

                <div className={styles.fieldGrid}>
                    <FormInputField
                        labelKey="tenants.appSettings.smtp.host"
                        name={['settings', 'smtp', 'host']}
                        disabled={!smtpAllowed}
                    />
                    <FormInputNumberField
                        labelKey="tenants.appSettings.smtp.port"
                        name={['settings', 'smtp', 'port']}
                        min={1}
                        max={65535}
                        disabled={!smtpAllowed}
                    />
                    <FormInputField
                        labelKey="tenants.appSettings.smtp.username"
                        name={['settings', 'smtp', 'username']}
                        disabled={!smtpAllowed}
                    />
                    <FormInputPasswordField
                        labelKey="tenants.appSettings.smtp.password"
                        name={['settings', 'smtp', 'password']}
                        disabled={!smtpAllowed}
                    />
                    <FormInputField
                        labelKey="tenants.appSettings.smtp.from"
                        name={['settings', 'smtp', 'from']}
                        disabled={!smtpAllowed}
                    />
                    <FormColorSelectorField
                        labelKey="tenants.appSettings.smtp.emailThemeColor"
                        name={['settings', 'smtp', 'emailThemeColor']}
                        disabled={!smtpAllowed}
                    />
                    <FormSwitchField
                        labelKey="tenants.appSettings.smtp.secure"
                        name={['settings', 'smtp', 'secure']}
                        inline
                        disableLabels
                        disabled={!smtpAllowed}
                    />
                </div>
            </Card>
        </CardEditable>
    );
};
