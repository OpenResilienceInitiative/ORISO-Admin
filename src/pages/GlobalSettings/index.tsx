import { Button, Form, message } from 'antd';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import SendOutlinedIcon from '@mui/icons-material/SendOutlined';
import LoginOutlinedIcon from '@mui/icons-material/LoginOutlined';
import { ThemeProvider } from '@mui/material/styles';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CardDeck } from '../../components/CardDeck';
import { CardEditable } from '../../components/CardEditable';
import { Card } from '../../components/Card';
import { MuiFormField } from '../../components/mui/MuiFormField';
import { MuiSwitchField } from '../../components/mui/MuiSwitchField/index';
import { orisoMuiTheme } from '../../theme/orisoMuiTheme';
import { useTenantData } from '../../hooks/useTenantData.hook';
import { useTenantAdminDataMutation } from '../../hooks/useTenantAdminDataMutation.hook';
import { mapTenantDataToTenantAdminData } from '../../utils/mapTenantDataToTenantAdminData';
import { useAppConfigContext } from '../../context/useAppConfig';
import { useSettingsAdminMutation } from '../../hooks/useSettingsAdminMutation.hook';
import { useUserData } from '../../hooks/useUserData.hook';
import { sendGlobalSmtpTestEmail } from '../../api/settings/sendGlobalSmtpTestEmail';
import { usePlatformSmtpSettings } from '../../hooks/usePlatformSmtpSettings';
import { TranslationApiKeysCardContainer } from '../../components/GlobalSettings/TranslationApiKeysCardContainer';
import { DocumentMasterDataCardContainer } from '../../components/GlobalSettings/DocumentMasterDataCardContainer';
import styles from './styles.module.scss';
import { resolveTenantId } from '../../utils/resolveTenantId';
import { extractApiErrorMessage } from '../../utils/extractApiErrorMessage';
import { ChatRecoverySettingsCard } from '../../components/GlobalSettings/ChatRecoverySettingsCard';
import { useChatRecoverySettings } from '../../hooks/useChatRecoverySettings.hook';
import { useUserRoles } from '../../hooks/useUserRoles.hook';
import { AccountInactivitySettingsCardContainer } from '../../components/GlobalSettings/AccountInactivitySettingsCard';

export const GlobalLoginSettingsPage = () => {
    const { t } = useTranslation();
    const { data, isLoading } = useTenantData();
    const tenantId = resolveTenantId(undefined, data?.id);
    const seedTenantAdminData = useMemo(
        () => (data?.id == null ? undefined : mapTenantDataToTenantAdminData(data)),
        [data],
    );
    const { mutate } = useTenantAdminDataMutation({
        id: tenantId,
        seedTenantAdminData,
        prefetchTenantAdminData: false,
        successMessageKey: 'tenants.message.settingsUpdate',
    });
    const initialValues = useMemo(() => ({ ...data }), [data]);
    const { isSuperAdmin } = useUserRoles();
    const recoverySettings = useChatRecoverySettings(isSuperAdmin);

    return (
        <div className={styles.globalConfigViewport}>
            <div className={styles.globalConfigGrid}>
                <div className={styles.compactCardColumn}>
                    <section className={styles.globalConfigCardSlot}>
                        <ThemeProvider theme={orisoMuiTheme}>
                            <CardEditable
                                className={styles.loginFunctionCard}
                                isLoading={isLoading}
                                initialValues={initialValues}
                                titleKey="tenants.globalSettings.anonymousChat.title"
                                onSave={mutate}
                                variant="dialog"
                                editButtonPlacement="footer"
                                headerIcon={<LoginOutlinedIcon />}
                            >
                                <div className={styles.checkGroup}>
                                    <MuiSwitchField
                                        label={t('tenants.permissions.anonymousChat.title')}
                                        name={['settings', 'featureAnonymousChatEnabled']}
                                    />
                                    {/* ORISO-Admin#602: this switch used to carry no visible
                                    description at all, while the string behind it promised
                                    "wird auf der Login-Seite nicht angezeigt" — behaviour
                                    nothing implements (`featureAnonymousChatEnabled` is read
                                    by no consumer in Frontend or UserService). Rather than
                                    invent the behaviour, the description now says what the
                                    switch actually does, and it is rendered so an admin can
                                    read it before deciding. */}
                                    <p className={styles.settingDescription}>
                                        {t('tenants.permissions.anonymousChat.description')}
                                    </p>
                                </div>
                            </CardEditable>
                        </ThemeProvider>
                    </section>
                    <section className={styles.translationCardSlot}>
                        <TranslationApiKeysCardContainer />
                    </section>
                    {isSuperAdmin && (
                        <section className={styles.globalConfigCardSlot}>
                            <ThemeProvider theme={orisoMuiTheme}>
                                <AccountInactivitySettingsCardContainer />
                            </ThemeProvider>
                        </section>
                    )}
                    {isSuperAdmin && (
                        <section className={styles.globalConfigCardSlot}>
                            <ThemeProvider theme={orisoMuiTheme}>
                                <ChatRecoverySettingsCard
                                    data={recoverySettings.data}
                                    isLoading={recoverySettings.isLoading}
                                    isSaving={recoverySettings.isSaving}
                                    error={recoverySettings.error}
                                    onSave={(settings, options) =>
                                        recoverySettings.save(settings, { onError: options?.onError })
                                    }
                                />
                            </ThemeProvider>
                        </section>
                    )}
                </div>
                {/* ORISO-Admin#735: operator master data for the living DPIA and the other legal
                    documents. The desktop grid keeps it beside the two compact configuration cards. */}
                <section className={styles.documentMasterDataCardSlot}>
                    <DocumentMasterDataCardContainer />
                </section>
            </div>
        </div>
    );
};

export const GlobalSmtpSettingsPage = () => {
    const { t } = useTranslation();
    const [featureForm] = Form.useForm();
    const [testForm] = Form.useForm();
    const { settings } = useAppConfigContext();
    const { data: userData } = useUserData();
    const { mutate, isPending } = useSettingsAdminMutation();
    const { data: platformSmtp, isLoading, isError, refetch } = usePlatformSmtpSettings();
    const [isTestSending, setIsTestSending] = useState(false);
    useEffect(() => {
        if (userData?.email && !testForm.getFieldValue('recipientEmail')) {
            testForm.setFieldValue('recipientEmail', userData.email);
        }
    }, [testForm, userData?.email]);
    const featureValues = useMemo(
        () => ({
            globalFeatureSystemNotificationEmailsEnabled:
                settings.globalFeatureSystemNotificationEmailsEnabled ?? false,
        }),
        [settings.globalFeatureSystemNotificationEmailsEnabled],
    );
    const handleSaveFeature = useCallback(
        (formData: unknown, options?: { onError?: () => void }) => {
            const enabled = (formData as { globalFeatureSystemNotificationEmailsEnabled?: boolean })
                .globalFeatureSystemNotificationEmailsEnabled;
            mutate({ globalFeatureSystemNotificationEmailsEnabled: enabled === true }, options);
        },
        [mutate],
    );
    const handleSendTestEmail = useCallback(async () => {
        const { recipientEmail } = await testForm.validateFields();
        const cleanedRecipientEmail = (recipientEmail || '').trim();
        if (!cleanedRecipientEmail) {
            message.error(t('globalSettings.smtp.test.errorMissingRecipient'));
            return;
        }
        setIsTestSending(true);
        try {
            await sendGlobalSmtpTestEmail({ recipientEmail: cleanedRecipientEmail });
            message.success(t('globalSettings.smtp.test.success', { email: cleanedRecipientEmail }));
        } catch (error) {
            const errorMessage = await extractApiErrorMessage(error, 'globalSettings.smtp.test.error');
            message.error(errorMessage);
        } finally {
            setIsTestSending(false);
        }
    }, [t, testForm]);
    const display = (value: string | number | null | undefined) =>
        value == null || value === '' ? t('globalSettings.smtp.deployment.unavailable') : String(value);

    return (
        <ThemeProvider theme={orisoMuiTheme}>
            <CardDeck
                className={styles.smtpPage}
                ariaLabel={t('globalSettings.smtp.cardDeck.ariaLabel')}
                previousLabel={t('globalSettings.smtp.cardDeck.previous')}
                nextLabel={t('globalSettings.smtp.cardDeck.next')}
            >
                <CardDeck.Item className={styles.smtpCardSlot}>
                    <CardEditable
                        className={styles.smtpCard}
                        variant="dialog"
                        headerIcon={<EmailOutlinedIcon />}
                        isLoading={isPending}
                        initialValues={featureValues}
                        titleKey="globalSettings.smtp.systemEmailToggle.title"
                        subTitleKey="globalSettings.smtp.systemEmailToggle.description"
                        onSave={handleSaveFeature}
                        formProp={featureForm}
                    >
                        <MuiSwitchField
                            className={styles.smtpSwitch}
                            label={t('globalSettings.smtp.systemEmailToggle.title')}
                            name={['globalFeatureSystemNotificationEmailsEnabled']}
                            switchLabel={t('globalSettings.smtp.systemEmailToggle.title')}
                        />
                    </CardEditable>
                </CardDeck.Item>
                <CardDeck.Item className={styles.smtpCardSlot}>
                    <Card
                        className={styles.smtpCard}
                        variant="dialog"
                        headerIcon={<EmailOutlinedIcon />}
                        titleKey="globalSettings.smtp.deployment.title"
                        subTitleKey="globalSettings.smtp.deployment.description"
                    >
                        {isLoading && (
                            <p className={styles.smtpReadStatus} role="status">
                                {t('globalSettings.smtp.deployment.loading')}
                            </p>
                        )}
                        {!isLoading && (isError || !platformSmtp) && (
                            <div className={styles.smtpReadStatus} role="alert">
                                <p>{t('globalSettings.smtp.deployment.error')}</p>
                                <Button
                                    onClick={() => {
                                        refetch();
                                    }}
                                >
                                    {t('globalSettings.smtp.deployment.retry')}
                                </Button>
                            </div>
                        )}
                        {!isLoading && !isError && platformSmtp && (
                            <dl className={styles.smtpReadOnly}>
                                <div>
                                    <dt>{t('globalSettings.smtp.host')}</dt>
                                    <dd>{display(platformSmtp.host)}</dd>
                                </div>
                                <div>
                                    <dt>{t('globalSettings.smtp.port')}</dt>
                                    <dd>{display(platformSmtp.port)}</dd>
                                </div>
                                <div>
                                    <dt>{t('globalSettings.smtp.secure')}</dt>
                                    <dd>
                                        {platformSmtp.secure == null
                                            ? display(null)
                                            : t(
                                                  platformSmtp.secure
                                                      ? 'globalSettings.smtp.deployment.yes'
                                                      : 'globalSettings.smtp.deployment.no',
                                              )}
                                    </dd>
                                </div>
                                <div>
                                    <dt>{t('globalSettings.smtp.from')}</dt>
                                    <dd>{display(platformSmtp.from)}</dd>
                                </div>
                                <div>
                                    <dt>{t('globalSettings.smtp.deployment.credentials')}</dt>
                                    <dd>
                                        {t(
                                            platformSmtp.credentialsPresent
                                                ? 'globalSettings.smtp.deployment.yes'
                                                : 'globalSettings.smtp.deployment.no',
                                        )}
                                    </dd>
                                </div>
                                <div>
                                    <dt>{t('globalSettings.smtp.deployment.configured')}</dt>
                                    <dd>
                                        {t(
                                            platformSmtp.configured
                                                ? 'globalSettings.smtp.deployment.yes'
                                                : 'globalSettings.smtp.deployment.no',
                                        )}
                                    </dd>
                                </div>
                            </dl>
                        )}
                    </Card>
                </CardDeck.Item>
                <CardDeck.Item className={styles.smtpCardSlot}>
                    <Card
                        className={styles.smtpCard}
                        variant="dialog"
                        headerIcon={<SendOutlinedIcon />}
                        titleKey="globalSettings.smtp.test.title"
                        subTitleKey="globalSettings.smtp.test.description"
                    >
                        <Form
                            className={styles.testForm}
                            form={testForm}
                            layout="vertical"
                            initialValues={{ recipientEmail: userData?.email ?? '' }}
                        >
                            <MuiFormField
                                label={t('globalSettings.smtp.test.recipientEmail')}
                                name={['recipientEmail']}
                                required
                                rules={[{ type: 'email', message: t('message.error.email.incorrect') }]}
                            />
                            <div className={styles.testAction}>
                                <Button
                                    className={styles.smtpActionButton}
                                    loading={isTestSending}
                                    onClick={handleSendTestEmail}
                                >
                                    {t('globalSettings.smtp.test.button')}
                                </Button>
                            </div>
                        </Form>
                    </Card>
                </CardDeck.Item>
            </CardDeck>
        </ThemeProvider>
    );
};
