import { Button, Col, Form, Row, message } from 'antd';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, Outlet } from 'react-router';
import { Page } from '../../components/Page';
import { CardEditable } from '../../components/CardEditable';
import { Card } from '../../components/Card';
import { FormSwitchField } from '../../components/FormSwitchField';
import { FormInputField } from '../../components/FormInputField';
import { FormInputPasswordField } from '../../components/FormInputPasswordField';
import { FormColorSelectorField } from '../../components/FormColorSelectorField';
import { useTenantData } from '../../hooks/useTenantData.hook';
import { useTenantAdminDataMutation } from '../../hooks/useTenantAdminDataMutation.hook';
import { useAppConfigContext } from '../../context/useAppConfig';
import { useSettingsAdminMutation } from '../../hooks/useSettingsAdminMutation.hook';
import { useUserData } from '../../hooks/useUserData.hook';
import { sendGlobalSmtpTestEmail } from '../../api/settings/sendGlobalSmtpTestEmail';
import { extractApiErrorMessage } from '../../utils/extractApiErrorMessage';
import styles from '../Tenants/Edit/GlobalSettings/styles.module.scss';

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
    const { data, isLoading } = useTenantData();
    const tenantId = data?.id ? `${data.id}` : '';
    const { mutate } = useTenantAdminDataMutation({
        id: tenantId,
        successMessageKey: 'tenants.message.settingsUpdate',
    });
    const initialValues = useMemo(() => ({ ...data }), [data]);

    return (
        <Row gutter={[24, 24]}>
            <Col span={12} sm={6}>
                <CardEditable
                    isLoading={isLoading}
                    initialValues={initialValues}
                    titleKey="tenants.globalSettings.anonymousChat.title"
                    onSave={mutate}
                >
                    <div className={styles.checkGroup}>
                        <FormSwitchField
                            labelKey="tenants.permissions.anonymousChat.title"
                            name={['settings', 'featureAnonymousChatEnabled']}
                            inline
                            disableLabels
                        />
                    </div>
                </CardEditable>
            </Col>
        </Row>
    );
};

export const GlobalSmtpSettingsPage = () => {
    const { t } = useTranslation();
    const [form] = Form.useForm();
    const [testForm] = Form.useForm();
    const { settings } = useAppConfigContext();
    const { data: userData } = useUserData();
    const { mutate, isLoading } = useSettingsAdminMutation();
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

    return (
        <Row gutter={[24, 24]}>
            <Col span={12} sm={6}>
                <CardEditable
                    isLoading={isLoading}
                    initialValues={initialValues}
                    titleKey="globalSettings.smtp.title"
                    onSave={mutate}
                    formProp={form}
                >
                    <div className={styles.checkGroup}>
                        <FormSwitchField
                            labelKey="globalSettings.smtp.systemEmailToggle.title"
                            name={['globalFeatureSystemNotificationEmailsEnabled']}
                            inline
                            disableLabels
                        />
                    </div>

                    <div className={styles.checkGroup}>
                        <FormSwitchField
                            labelKey="globalSettings.smtp.smtpToggle.title"
                            name={['globalSmtpEnabled']}
                            inline
                            disableLabels
                        />
                    </div>

                    <FormInputField labelKey="globalSettings.smtp.host" name={['globalSmtpHost']} />
                    <FormInputField labelKey="globalSettings.smtp.port" name={['globalSmtpPort']} />
                    <FormInputField labelKey="globalSettings.smtp.username" name={['globalSmtpUsername']} />
                    <FormInputPasswordField
                        labelKey="globalSettings.smtp.password"
                        name={['globalSmtpPassword']}
                        autoComplete="current-password"
                    />
                    <FormInputField labelKey="globalSettings.smtp.from" name={['globalSmtpFrom']} />
                    <FormColorSelectorField
                        labelKey="globalSettings.smtp.emailThemeColor"
                        name={['globalSmtpEmailThemeColor']}
                    />
                    <FormSwitchField
                        labelKey="globalSettings.smtp.secure"
                        name={['globalSmtpSecure']}
                        inline
                        disableLabels
                    />
                </CardEditable>
            </Col>
            <Col span={12} sm={6}>
                <Card titleKey="globalSettings.smtp.test.title">
                    <Form
                        form={testForm}
                        layout="vertical"
                        initialValues={{
                            recipientEmail: userData?.email ?? '',
                        }}
                    >
                        <FormInputField
                            labelKey="globalSettings.smtp.test.recipientEmail"
                            name={['recipientEmail']}
                            required
                            rules={[{ type: 'email', message: t('message.error.email.incorrect') }]}
                        />
                        <div className={styles.checkGroup}>
                            <Button loading={isTestSending} onClick={handleSendTestEmail}>
                                {t('globalSettings.smtp.test.button')}
                            </Button>
                        </div>
                    </Form>
                </Card>
            </Col>
        </Row>
    );
};

export const GlobalSettingsIndexRedirect = () => <Navigate to="/admin/global-settings/login" replace />;
