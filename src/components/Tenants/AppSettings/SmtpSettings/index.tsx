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

const isBlank = (value?: string | number | boolean | null) => value === undefined || value === null || value === '';

const inheritString = (value: string | null | undefined, inheritedValue: string) =>
    isBlank(value) ? inheritedValue : value;

const inheritBoolean = (value: boolean | null | undefined, inheritedValue: boolean) =>
    value === undefined || value === null ? inheritedValue : value;

const inheritNumber = (value: number | null | undefined, inheritedValue: number) =>
    value === undefined || value === null ? inheritedValue : value;

const normalizeSmtpPort = (value: string | undefined) => {
    if (isBlank(value)) {
        return DEFAULT_SMTP_SETTINGS.smtp.port;
    }

    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : DEFAULT_SMTP_SETTINGS.smtp.port;
};

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
    const inheritedSettings = useMemo(
        () => ({
            featureSystemNotificationEmailsEnabled:
                settings.globalFeatureSystemNotificationEmailsEnabled ??
                DEFAULT_SMTP_SETTINGS.featureSystemNotificationEmailsEnabled,
            smtp: {
                enabled: settings.globalSmtpEnabled ?? DEFAULT_SMTP_SETTINGS.smtp.enabled,
                host: settings.globalSmtpHost ?? DEFAULT_SMTP_SETTINGS.smtp.host,
                port: normalizeSmtpPort(settings.globalSmtpPort),
                secure: settings.globalSmtpSecure ?? DEFAULT_SMTP_SETTINGS.smtp.secure,
                username: settings.globalSmtpUsername ?? DEFAULT_SMTP_SETTINGS.smtp.username,
                password: settings.globalSmtpPassword ?? DEFAULT_SMTP_SETTINGS.smtp.password,
                from: settings.globalSmtpFrom ?? DEFAULT_SMTP_SETTINGS.smtp.from,
                emailThemeColor: settings.globalSmtpEmailThemeColor ?? DEFAULT_SMTP_SETTINGS.smtp.emailThemeColor,
            },
        }),
        [
            settings.globalFeatureSystemNotificationEmailsEnabled,
            settings.globalSmtpEmailThemeColor,
            settings.globalSmtpEnabled,
            settings.globalSmtpFrom,
            settings.globalSmtpHost,
            settings.globalSmtpPassword,
            settings.globalSmtpPort,
            settings.globalSmtpSecure,
            settings.globalSmtpUsername,
        ],
    );
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
    const initialValues = useMemo(() => {
        const tenantSettings = data?.settings ?? {};
        const tenantSmtpSettings = tenantSettings.smtp ?? {};

        return applyPlatformEmailRestrictions({
            ...data,
            settings: {
                ...DEFAULT_SMTP_SETTINGS,
                ...inheritedSettings,
                ...tenantSettings,
                featureSystemNotificationEmailsEnabled: inheritBoolean(
                    tenantSettings.featureSystemNotificationEmailsEnabled,
                    inheritedSettings.featureSystemNotificationEmailsEnabled,
                ),
                smtp: {
                    ...DEFAULT_SMTP_SETTINGS.smtp,
                    ...inheritedSettings.smtp,
                    ...tenantSmtpSettings,
                    enabled: inheritBoolean(tenantSmtpSettings.enabled, inheritedSettings.smtp.enabled),
                    host: inheritString(tenantSmtpSettings.host, inheritedSettings.smtp.host),
                    port: inheritNumber(tenantSmtpSettings.port, inheritedSettings.smtp.port),
                    secure: inheritBoolean(tenantSmtpSettings.secure, inheritedSettings.smtp.secure),
                    username: inheritString(tenantSmtpSettings.username, inheritedSettings.smtp.username),
                    password: inheritString(tenantSmtpSettings.password, inheritedSettings.smtp.password),
                    from: inheritString(tenantSmtpSettings.from, inheritedSettings.smtp.from),
                    emailThemeColor: inheritString(
                        tenantSmtpSettings.emailThemeColor,
                        inheritedSettings.smtp.emailThemeColor,
                    ),
                },
            },
        });
    }, [applyPlatformEmailRestrictions, data, inheritedSettings]);
    const formKey = useMemo(
        () =>
            [
                'smtp',
                tenantId,
                systemEmailsAllowed,
                smtpAllowed,
                inheritedSettings.featureSystemNotificationEmailsEnabled,
                inheritedSettings.smtp.enabled,
                inheritedSettings.smtp.host,
                inheritedSettings.smtp.port,
                inheritedSettings.smtp.secure,
                inheritedSettings.smtp.username,
                inheritedSettings.smtp.password,
                inheritedSettings.smtp.from,
                inheritedSettings.smtp.emailThemeColor,
                data?.settings?.featureSystemNotificationEmailsEnabled,
                data?.settings?.smtp?.enabled,
                data?.settings?.smtp?.host,
                data?.settings?.smtp?.port,
                data?.settings?.smtp?.secure,
                data?.settings?.smtp?.username,
                data?.settings?.smtp?.password,
                data?.settings?.smtp?.from,
                data?.settings?.smtp?.emailThemeColor,
            ].join('|'),
        [data, inheritedSettings, smtpAllowed, systemEmailsAllowed, tenantId],
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
        <CardEditable
            key={formKey}
            isLoading={isLoading}
            initialValues={initialValues}
            titleKey="tenants.appSettings.smtp.title"
            onSave={(formData) => mutate(applyPlatformEmailRestrictions(formData))}
        >
            <Card className={styles.sectionCard} size="small" bordered>
                <div className={styles.checkGroup}>
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
            </Card>
        </CardEditable>
    );
};
