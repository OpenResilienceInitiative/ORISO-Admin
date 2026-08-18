import { Button, Form, message } from 'antd';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import SendOutlinedIcon from '@mui/icons-material/SendOutlined';
import LoginOutlinedIcon from '@mui/icons-material/LoginOutlined';
import { ThemeProvider } from '@mui/material/styles';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, Outlet } from 'react-router-dom';
import { Page } from '../../components/Page';
import { CardDeck } from '../../components/CardDeck';
import { CardEditable } from '../../components/CardEditable';
import { Card } from '../../components/Card';
import { MuiColorField } from '../../components/mui/MuiColorField';
import { MuiFormField, MuiNumberFormField, MuiPasswordFormField } from '../../components/mui/MuiFormField';
import { MuiSwitchField } from '../../components/mui/MuiSwitchField/index';
import { orisoMuiTheme } from '../../theme/orisoMuiTheme';
import { useTenantData } from '../../hooks/useTenantData.hook';
import { useTenantAdminDataMutation } from '../../hooks/useTenantAdminDataMutation.hook';
import { mapTenantDataToTenantAdminData } from '../../utils/mapTenantDataToTenantAdminData';
import { useAppConfigContext } from '../../context/useAppConfig';
import { useSettingsAdminMutation } from '../../hooks/useSettingsAdminMutation.hook';
import { useUserData } from '../../hooks/useUserData.hook';
import { sendGlobalSmtpTestEmail } from '../../api/settings/sendGlobalSmtpTestEmail';
import { TranslationApiKeysCardContainer } from '../../components/GlobalSettings/TranslationApiKeysCardContainer';
import { DocumentMasterDataCardContainer } from '../../components/GlobalSettings/DocumentMasterDataCardContainer';
import styles from './styles.module.scss';
import { resolveTenantId } from '../../utils/resolveTenantId';
import { extractApiErrorMessage } from '../../utils/extractApiErrorMessage';

export const GlobalSettingsPage = () => {
    return (
        <Page>
            <Page.Title
                titleKey="globalSettings.pageTitle"
                tabs={[
                    {
                        to: '/admin/global-settings/login',
                        titleKey: 'globalSettings.tabs.login',
                    },
                    {
                        to: '/admin/global-settings/smtp',
                        titleKey: 'globalSettings.tabs.smtp',
                    },
                ]}
            />
            <Outlet />
        </Page>
    );
};

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

    return (
        <div className={styles.globalConfigGrid}>
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
            {/* ORISO-Admin#735: operator master data for the living DPIA and the other legal
                documents. Spans the full grid width — it carries four field groups. */}
            <section className={styles.documentMasterDataCardSlot}>
                <DocumentMasterDataCardContainer />
            </section>
        </div>
    );
};

export const GlobalSmtpSettingsPage = () => {
    const { t } = useTranslation();
    const [form] = Form.useForm();
    const [testForm] = Form.useForm();
    const { settings } = useAppConfigContext();
    const { data: userData } = useUserData();
    const { mutate, isPending } = useSettingsAdminMutation();
    const [isTestSending, setIsTestSending] = useState(false);
    const initialValues = useMemo(
        () => ({
            globalFeatureSystemNotificationEmailsEnabled:
                settings.globalFeatureSystemNotificationEmailsEnabled ?? false,
            globalSmtpEnabled: settings.globalSmtpEnabled ?? false,
            globalSmtpHost: settings.globalSmtpHost ?? '',
            globalSmtpPort: settings.globalSmtpPort ?? '587',
            globalSmtpSecure: settings.globalSmtpSecure ?? false,
            globalSmtpUsername: settings.globalSmtpUsername ?? '',
            globalSmtpPassword: settings.globalSmtpPassword ?? '',
            globalSmtpFrom: settings.globalSmtpFrom ?? '',
            globalSmtpEmailThemeColor: settings.globalSmtpEmailThemeColor ?? '#0f3b8f',
        }),
        [settings],
    );
    const handleSendTestEmail = useCallback(async () => {
        const values = form.getFieldsValue(true);
        const { recipientEmail } = await testForm.validateFields();
        const cleanedRecipientEmail = (recipientEmail || '').trim();

        if (!cleanedRecipientEmail) {
            message.error(t('globalSettings.smtp.test.errorMissingRecipient'));
            return;
        }

        if (
            !values.globalSmtpHost ||
            !values.globalSmtpPort ||
            !values.globalSmtpUsername ||
            !values.globalSmtpPassword ||
            !values.globalSmtpFrom
        ) {
            message.error(t('globalSettings.smtp.test.errorMissingSmtp'));
            return;
        }
        setIsTestSending(true);
        try {
            await sendGlobalSmtpTestEmail({
                host: values.globalSmtpHost || '',
                port: Number(values.globalSmtpPort || 0),
                secure: !!values.globalSmtpSecure,
                username: values.globalSmtpUsername || '',
                password: values.globalSmtpPassword || '',
                from: values.globalSmtpFrom || '',
                recipientEmail: cleanedRecipientEmail,
                emailThemeColor: values.globalSmtpEmailThemeColor || '#0f3b8f',
            });
            message.success(t('globalSettings.smtp.test.success', { email: cleanedRecipientEmail }));
        } catch (error) {
            const errorMessage = await extractApiErrorMessage(error, 'globalSettings.smtp.test.error');
            message.error(errorMessage);
        } finally {
            setIsTestSending(false);
        }
    }, [form, t, testForm]);
    const renderSwitchLabel = useCallback(
        (titleKey: string, descriptionKey: string) => (
            <span className={styles.switchCopy}>
                <span className={styles.switchTitle}>{t(titleKey)}</span>
                <span className={styles.switchDescription}>{t(descriptionKey)}</span>
            </span>
        ),
        [t],
    );

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
                        initialValues={initialValues}
                        titleKey="globalSettings.smtp.title"
                        subTitleKey="globalSettings.smtp.description"
                        onSave={mutate}
                        formProp={form}
                    >
                        <div className={styles.fieldGrid}>
                            <MuiSwitchField
                                className={styles.smtpSwitch}
                                label={renderSwitchLabel(
                                    'globalSettings.smtp.systemEmailToggle.title',
                                    'globalSettings.smtp.systemEmailToggle.description',
                                )}
                                name={['globalFeatureSystemNotificationEmailsEnabled']}
                                switchLabel={t('globalSettings.smtp.systemEmailToggle.title')}
                            />

                            <MuiSwitchField
                                className={styles.smtpSwitch}
                                label={renderSwitchLabel(
                                    'globalSettings.smtp.smtpToggle.title',
                                    'globalSettings.smtp.smtpToggle.description',
                                )}
                                name={['globalSmtpEnabled']}
                                switchLabel={t('globalSettings.smtp.smtpToggle.title')}
                            />

                            <MuiFormField label={t('globalSettings.smtp.host')} name={['globalSmtpHost']} />
                            <MuiNumberFormField label={t('globalSettings.smtp.port')} name={['globalSmtpPort']} />
                            <MuiFormField label={t('globalSettings.smtp.username')} name={['globalSmtpUsername']} />
                            <MuiPasswordFormField
                                label={t('globalSettings.smtp.password')}
                                name={['globalSmtpPassword']}
                                autoComplete="current-password"
                            />
                            <MuiFormField label={t('globalSettings.smtp.from')} name={['globalSmtpFrom']} />
                            <MuiColorField
                                className={styles.colorField}
                                labelKey="globalSettings.smtp.emailThemeColor"
                                name={['globalSmtpEmailThemeColor']}
                            />
                            <MuiSwitchField
                                className={styles.smtpSwitch}
                                label={renderSwitchLabel(
                                    'globalSettings.smtp.secure',
                                    'globalSettings.smtp.secure.description',
                                )}
                                name={['globalSmtpSecure']}
                                switchLabel={t('globalSettings.smtp.secure')}
                            />
                        </div>
                    </CardEditable>
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
                            initialValues={{
                                recipientEmail: userData?.email ?? '',
                            }}
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

export const GlobalSettingsIndexRedirect = () => <Navigate to="/admin/global-settings/login" replace />;
