import { useCallback } from 'react';
import { Button, Col, Form, notification, Row } from 'antd';
import { ThemeProvider } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import routePathNames from '../../../appConfig';
import { Card } from '../../../components/Card';
import { MuiFormField, MuiPasswordFormField } from '../../../components/mui/MuiFormField';
import { Page } from '../../../components/Page';
import { useCreateGlobalSupportAdmin } from '../../../hooks/useCreateGlobalSupportAdmin';
import { orisoMuiTheme } from '../../../theme/orisoMuiTheme';
import { extractApiErrorMessage } from '../../../utils/extractApiErrorMessage';

export const GlobalSupportAdminCreate = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [form] = Form.useForm();
    const requiredRule = { required: true, message: t('form.errors.required') };
    const { mutate, isPending } = useCreateGlobalSupportAdmin({
        onSuccess: () => {
            notification.success({ message: t('globalSupportAdmins.created') });
            navigate(routePathNames.globalSupportAdmins);
        },
        onError: async (error) => {
            notification.error({ message: await extractApiErrorMessage(error), duration: 8 });
        },
    });
    const onCancel = useCallback(() => navigate(routePathNames.globalSupportAdmins), [navigate]);

    return (
        <Page>
            <Page.BackWithActions path={routePathNames.globalSupportAdmins} title={t('globalSupportAdmins.create')}>
                <Button type="text" className="admin-m3-text-button" onClick={onCancel}>
                    {t('btn.cancel')}
                </Button>
                <Button type="text" className="admin-m3-text-button" loading={isPending} onClick={() => form.submit()}>
                    {t('save')}
                </Button>
            </Page.BackWithActions>
            <ThemeProvider theme={orisoMuiTheme}>
                <Form layout="vertical" form={form} onFinish={mutate}>
                    <Row gutter={[24, 24]}>
                        <Col xs={24} lg={12}>
                            <Card titleKey="tenantAdmins.card.personalDataTitle">
                                <MuiFormField
                                    name="firstname"
                                    label={t('firstname')}
                                    placeholder={t('placeholder.firstname')}
                                    required
                                    rules={[requiredRule]}
                                />
                                <MuiFormField
                                    name="lastname"
                                    label={t('lastname')}
                                    placeholder={t('placeholder.lastname')}
                                    required
                                    rules={[requiredRule]}
                                />
                                <MuiFormField
                                    name="email"
                                    label={t('email')}
                                    placeholder={t('placeholder.email')}
                                    required
                                    rules={[
                                        requiredRule,
                                        { type: 'email', message: t('message.error.email.incorrect') },
                                    ]}
                                />
                            </Card>
                        </Col>
                        <Col xs={24} lg={12}>
                            <Card titleKey="tenantAdmins.card.credentialsTitle">
                                <MuiFormField
                                    name="username"
                                    label={t('tenantAdmins.form.username')}
                                    placeholder={t('tenantAdmins.form.username')}
                                    required
                                    rules={[requiredRule]}
                                />
                                <MuiPasswordFormField
                                    name="password"
                                    label={t('tenantAdmins.form.password')}
                                    placeholder={t('placeholder.password')}
                                    helpText={t('tenantAdmins.hint.password')}
                                    rules={[
                                        {
                                            validator: (_, value) =>
                                                !value || value.length >= 8
                                                    ? Promise.resolve()
                                                    : Promise.reject(new Error(t('message.error.password.minLength'))),
                                        },
                                    ]}
                                />
                            </Card>
                        </Col>
                    </Row>
                </Form>
            </ThemeProvider>
        </Page>
    );
};
