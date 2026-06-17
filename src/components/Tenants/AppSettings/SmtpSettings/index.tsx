import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
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
    const renderSwitchLabel = useCallback(
        (titleKey: string, descriptionKey?: string) => (
            <span className={styles.switchCopy}>
                <span className={styles.switchTitle}>{t(titleKey)}</span>
                {descriptionKey && <span className={styles.switchDescription}>{t(descriptionKey)}</span>}
            </span>
        ),
        [t],
    );

    return (
        <div className={styles.smtpCardShell}>
            <CardEditable
                className={styles.smtpCard}
                key={`smtp-${systemEmailsAllowed}-${smtpAllowed}`}
                variant="dialog"
                headerIcon={<EmailOutlinedIcon />}
                isLoading={isLoading}
                initialValues={initialValues}
                titleKey="tenants.appSettings.smtp.title"
                subTitleKey="tenants.appSettings.smtp.description"
                onSave={(formData) => mutate(applyPlatformEmailRestrictions(formData))}
            >
                <div className={styles.fieldGrid}>
                    <FormSwitchField
                        className={styles.smtpSwitch}
                        label={renderSwitchLabel(
                            'tenants.appSettings.smtp.systemEmailToggle.title',
                            'tenants.appSettings.smtp.systemEmailToggle.description',
                        )}
                        name={['settings', 'featureSystemNotificationEmailsEnabled']}
                        inline
                        disableLabels
                        disabled={!systemEmailsAllowed}
                        switchLabel={t('tenants.appSettings.smtp.systemEmailToggle.title')}
                        switchVariant="m3"
                    />

                    <FormSwitchField
                        className={styles.smtpSwitch}
                        label={renderSwitchLabel(
                            'tenants.appSettings.smtp.smtpToggle.title',
                            'tenants.appSettings.smtp.smtpToggle.description',
                        )}
                        name={['settings', 'smtp', 'enabled']}
                        inline
                        disableLabels
                        disabled={!smtpAllowed}
                        switchLabel={t('tenants.appSettings.smtp.smtpToggle.title')}
                        switchVariant="m3"
                    />

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
                        className={styles.colorField}
                        labelKey="tenants.appSettings.smtp.emailThemeColor"
                        name={['settings', 'smtp', 'emailThemeColor']}
                        disabled={!smtpAllowed}
                    />
                    <FormSwitchField
                        className={styles.smtpSwitch}
                        label={renderSwitchLabel('tenants.appSettings.smtp.secure')}
                        name={['settings', 'smtp', 'secure']}
                        inline
                        disableLabels
                        disabled={!smtpAllowed}
                        switchLabel={t('tenants.appSettings.smtp.secure')}
                        switchVariant="m3"
                    />
                </div>
            </CardEditable>
        </div>
    );
};
