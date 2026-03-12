import { Col, Row } from 'antd';
import { useMemo } from 'react';
import { Navigate, Outlet } from 'react-router';
import { Page } from '../../components/Page';
import { CardEditable } from '../../components/CardEditable';
import { FormSwitchField } from '../../components/FormSwitchField';
import { FormInputField } from '../../components/FormInputField';
import { FormInputPasswordField } from '../../components/FormInputPasswordField';
import { FormColorSelectorField } from '../../components/FormColorSelectorField';
import { useTenantData } from '../../hooks/useTenantData.hook';
import { useTenantAdminDataMutation } from '../../hooks/useTenantAdminDataMutation.hook';
import { useAppConfigContext } from '../../context/useAppConfig';
import { useSettingsAdminMutation } from '../../hooks/useSettingsAdminMutation.hook';
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
    const { settings } = useAppConfigContext();
    const { mutate, isLoading } = useSettingsAdminMutation();
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

    return (
        <Row gutter={[24, 24]}>
            <Col span={12} sm={6}>
                <CardEditable
                    isLoading={isLoading}
                    initialValues={initialValues}
                    titleKey="globalSettings.smtp.title"
                    onSave={mutate}
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
                    <FormInputPasswordField labelKey="globalSettings.smtp.password" name={['globalSmtpPassword']} />
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
        </Row>
    );
};

export const GlobalSettingsIndexRedirect = () => <Navigate to="/admin/global-settings/login" replace />;
