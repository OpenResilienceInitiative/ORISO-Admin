import { Alert, Form, Modal } from 'antd';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import { ThemeProvider } from '@mui/material/styles';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { CardDeck } from '../../../CardDeck';
import { CardEditable } from '../../../CardEditable';
import { MuiFormField, MuiNumberFormField, MuiPasswordFormField } from '../../../mui/MuiFormField';
import { MuiSwitchField } from '../../../mui/MuiSwitchField/index';
import { MuiColorField } from '../../../mui/MuiColorField';
import { orisoMuiTheme } from '../../../../theme/orisoMuiTheme';
import { MuiRadioGroupField } from '../../../mui/MuiRadioGroupField';
import { useAppConfigContext } from '../../../../context/useAppConfig';
import { useSingleTenantData, TENANT_QUERY_KEY } from '../../../../hooks/useSingleTenantData';
import { useTenantAdminDataMutation } from '../../../../hooks/useTenantAdminDataMutation.hook';
import { TENANT_ADMIN_DATA_KEY } from '../../../../hooks/useTenantAdminData.hook';
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

const isBlank = (value?: string | number | boolean | null) =>
    value === undefined || value === null || (typeof value === 'string' && value.trim() === '');

const inheritBoolean = (value: boolean | null | undefined, inheritedValue: boolean) =>
    value === undefined || value === null ? inheritedValue : value;

const needsTransportConfirmation = (port: number | undefined, secure: boolean | undefined) =>
    port != null && !((port === 465 && secure === true) || (port === 587 && secure === false));

export const SmtpSettings = ({ tenantId }: { tenantId: string }) => {
    const { t } = useTranslation();
    const { settings } = useAppConfigContext();
    const { data, isLoading } = useSingleTenantData({ id: tenantId });
    const [form] = Form.useForm();
    const queryClient = useQueryClient();
    const { mutate } = useTenantAdminDataMutation({
        id: tenantId,
        successMessageKey: 'tenants.message.settingsUpdate',
        onSuccess: () => {
            // never keep the typed secret around: clear the field and drop the cached
            // PUT payload so the next read comes from the write-only API (#730)
            form.resetFields([['settings', 'smtp', 'password']]);
            queryClient.invalidateQueries({ queryKey: [TENANT_ADMIN_DATA_KEY] });
            queryClient.invalidateQueries({ queryKey: [TENANT_QUERY_KEY, Number(tenantId)] });
        },
    });
    const systemEmailsAllowed = settings.globalFeatureSystemNotificationEmailsEnabled !== false;
    const ownServerSelected = Form.useWatch(['settings', 'smtpMode'], form) === 'OWN';
    const smtpPort = Form.useWatch(['settings', 'smtp', 'port'], form);
    const smtpSecure = Form.useWatch(['settings', 'smtp', 'secure'], form);
    const prepareTenantSettings = useCallback(
        (formData) => ({
            ...formData,
            settings: {
                ...(formData?.settings ?? {}),
                featureSystemNotificationEmailsEnabled: systemEmailsAllowed
                    ? formData?.settings?.featureSystemNotificationEmailsEnabled
                    : false,
                smtp:
                    formData?.settings?.smtpMode === 'OWN'
                        ? { ...formData?.settings?.smtp, enabled: true }
                        : { enabled: false, emailThemeColor: formData?.settings?.smtp?.emailThemeColor },
            },
        }),
        [systemEmailsAllowed],
    );
    const tenantSmtpPasswordSet = useMemo(() => {
        const tenantSmtpSettings = data?.settings?.smtp ?? {};
        // passwordSet comes from the write-only API (#730); tolerate older backends
        // that still return the password value itself without ever displaying it.
        return Boolean(tenantSmtpSettings.passwordSet ?? !isBlank(tenantSmtpSettings.password));
    }, [data]);
    const initialValues = useMemo(() => {
        const tenantSettings = data?.settings ?? {};
        const tenantSmtpSettings = tenantSettings.smtp ?? {};

        return {
            ...data,
            settings: {
                ...DEFAULT_SMTP_SETTINGS,
                ...tenantSettings,
                smtpMode: tenantSettings.smtpMode ?? undefined,
                featureSystemNotificationEmailsEnabled: inheritBoolean(
                    tenantSettings.featureSystemNotificationEmailsEnabled,
                    settings.globalFeatureSystemNotificationEmailsEnabled ??
                        DEFAULT_SMTP_SETTINGS.featureSystemNotificationEmailsEnabled,
                ),
                smtp: {
                    ...DEFAULT_SMTP_SETTINGS.smtp,
                    ...tenantSmtpSettings,
                    enabled: tenantSmtpSettings.enabled === true,
                    host: tenantSmtpSettings.host ?? '',
                    port: tenantSmtpSettings.port ?? DEFAULT_SMTP_SETTINGS.smtp.port,
                    secure: tenantSmtpSettings.secure ?? false,
                    username: tenantSmtpSettings.username ?? '',
                    // set-only semantics (#730): the field always starts empty; blank = keep stored password
                    password: '',
                    from: tenantSmtpSettings.from ?? '',
                    emailThemeColor: tenantSmtpSettings.emailThemeColor ?? DEFAULT_SMTP_SETTINGS.smtp.emailThemeColor,
                },
            },
        };
    }, [data, settings.globalFeatureSystemNotificationEmailsEnabled]);
    const formKey = useMemo(
        () =>
            [
                'smtp',
                tenantId,
                systemEmailsAllowed,
                settings.globalFeatureSystemNotificationEmailsEnabled,
                data?.settings?.featureSystemNotificationEmailsEnabled,
                data?.settings?.smtpMode,
                data?.settings?.smtp?.enabled,
                data?.settings?.smtp?.host,
                data?.settings?.smtp?.port,
                data?.settings?.smtp?.secure,
                data?.settings?.smtp?.username,
                tenantSmtpPasswordSet,
                data?.settings?.smtp?.from,
                data?.settings?.smtp?.emailThemeColor,
            ].join('|'),
        [
            data,
            settings.globalFeatureSystemNotificationEmailsEnabled,
            systemEmailsAllowed,
            tenantId,
            tenantSmtpPasswordSet,
        ],
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
    const ownServerRule = (acceptStoredPassword = false, port = false) => ({
        validator: (_: unknown, value: string | number | undefined) =>
            form.getFieldValue(['settings', 'smtpMode']) !== 'OWN' ||
            (!isBlank(value) && (!port || (Number(value) >= 1 && Number(value) <= 65535))) ||
            (acceptStoredPassword && tenantSmtpPasswordSet)
                ? Promise.resolve()
                : Promise.reject(new Error(t('tenants.appSettings.smtp.ownServerIncomplete'))),
    });

    return (
        <ThemeProvider theme={orisoMuiTheme}>
            <CardDeck
                className={styles.smtpPage}
                ariaLabel={t('tenants.appSettings.smtp.title')}
                previousLabel={t('globalSettings.smtp.cardDeck.previous')}
                nextLabel={t('globalSettings.smtp.cardDeck.next')}
            >
                <CardDeck.Item className={styles.smtpCardSlot}>
                    <CardEditable
                        key={formKey}
                        className={styles.smtpCard}
                        variant="dialog"
                        headerIcon={<EmailOutlinedIcon />}
                        formProp={form}
                        isLoading={isLoading}
                        initialValues={initialValues}
                        titleKey="tenants.appSettings.smtp.title"
                        subTitleKey="tenants.appSettings.smtp.description"
                        onSave={(formData, options) => {
                            const save = () =>
                                mutate(prepareTenantSettings(formData), {
                                    onError: () => options?.onError?.(),
                                });
                            const mode = form.getFieldValue(['settings', 'smtpMode']);
                            const port = form.getFieldValue(['settings', 'smtp', 'port']);
                            const secure = form.getFieldValue(['settings', 'smtp', 'secure']);
                            if (mode !== 'OWN' || !needsTransportConfirmation(port, secure)) {
                                save();
                                return;
                            }
                            Modal.confirm({
                                title: t('tenants.appSettings.smtp.transportMismatchTitle'),
                                content: t('tenants.appSettings.smtp.transportMismatchExplanation'),
                                okText: t('tenants.appSettings.smtp.transportMismatchConfirm'),
                                cancelText: t('tenants.appSettings.smtp.transportMismatchCancel'),
                                onOk: save,
                                onCancel: () => options?.onError?.(),
                            });
                        }}
                    >
                        <div className={styles.fieldGrid}>
                            {data?.settings?.smtpMode == null && (
                                <Alert
                                    type="warning"
                                    showIcon
                                    message={t('tenants.appSettings.smtp.legacyModeMissing')}
                                />
                            )}
                            <MuiSwitchField
                                className={styles.smtpSwitch}
                                label={renderSwitchLabel(
                                    'tenants.appSettings.smtp.systemEmailToggle.title',
                                    'tenants.appSettings.smtp.systemEmailToggle.description',
                                )}
                                name={['settings', 'featureSystemNotificationEmailsEnabled']}
                                disabled={!systemEmailsAllowed}
                                switchLabel={t('tenants.appSettings.smtp.systemEmailToggle.title')}
                            />

                            <MuiRadioGroupField
                                vertical
                                required
                                labelKey="tenants.appSettings.smtp.mode"
                                name={['settings', 'smtpMode']}
                            >
                                <MuiRadioGroupField.Radio value="PLATFORM">
                                    {t('tenants.appSettings.smtp.platformMode')}
                                </MuiRadioGroupField.Radio>
                                <MuiRadioGroupField.Radio value="OWN">
                                    {t('tenants.appSettings.smtp.ownMode')}
                                </MuiRadioGroupField.Radio>
                            </MuiRadioGroupField>

                            {ownServerSelected && needsTransportConfirmation(smtpPort, smtpSecure) && (
                                <Alert
                                    type="warning"
                                    showIcon
                                    message={t('tenants.appSettings.smtp.transportMismatchHint')}
                                />
                            )}

                            <MuiFormField
                                label={t('tenants.appSettings.smtp.host')}
                                name={['settings', 'smtp', 'host']}
                                helpText={t('tenants.appSettings.smtp.host.helpText')}
                                rules={[ownServerRule()]}
                                disabled={!ownServerSelected}
                            />
                            <MuiNumberFormField
                                label={t('tenants.appSettings.smtp.port')}
                                name={['settings', 'smtp', 'port']}
                                helpText={t('tenants.appSettings.smtp.port.helpText')}
                                min={1}
                                inputProps={{ max: 65535 }}
                                rules={[
                                    ownServerRule(false, true),
                                    {
                                        type: 'number',
                                        min: 1,
                                        max: 65535,
                                        message: t('tenants.appSettings.smtp.port.invalid'),
                                    },
                                ]}
                                disabled={!ownServerSelected}
                            />
                            <MuiFormField
                                label={t('tenants.appSettings.smtp.username')}
                                name={['settings', 'smtp', 'username']}
                                helpText={t('tenants.appSettings.smtp.username.helpText')}
                                rules={[ownServerRule()]}
                                autoComplete="off"
                                disabled={!ownServerSelected}
                            />
                            <MuiPasswordFormField
                                label={t('tenants.appSettings.smtp.passwordNew')}
                                name={['settings', 'smtp', 'password']}
                                helpText={t(
                                    tenantSmtpPasswordSet
                                        ? 'tenants.appSettings.smtp.passwordStored'
                                        : 'tenants.appSettings.smtp.passwordNotSet',
                                )}
                                rules={[ownServerRule(true)]}
                                autoComplete="new-password"
                                disabled={!ownServerSelected}
                            />
                            <MuiFormField
                                label={t('tenants.appSettings.smtp.from')}
                                name={['settings', 'smtp', 'from']}
                                helpText={t('tenants.appSettings.smtp.from.helpText')}
                                rules={[ownServerRule()]}
                                disabled={!ownServerSelected}
                            />
                            <MuiColorField
                                className={styles.colorField}
                                labelKey="tenants.appSettings.smtp.emailThemeColor"
                                help="tenants.appSettings.smtp.emailThemeColor.helpText"
                                name={['settings', 'smtp', 'emailThemeColor']}
                            />
                            <MuiSwitchField
                                className={styles.smtpSwitch}
                                label={renderSwitchLabel(
                                    'tenants.appSettings.smtp.secure',
                                    'tenants.appSettings.smtp.secure.description',
                                )}
                                name={['settings', 'smtp', 'secure']}
                                disabled={!ownServerSelected}
                                switchLabel={t('tenants.appSettings.smtp.secure')}
                            />
                        </div>
                    </CardEditable>
                </CardDeck.Item>
            </CardDeck>
        </ThemeProvider>
    );
};
