import { useState } from 'react';
import { Form, Input, Button, message } from 'antd';
import { useTranslation } from 'react-i18next';
import Title from 'antd/es/typography/Title';
import { useNavigate } from 'react-router-dom';
import CustomLockIcon from '../../components/CustomIcons/Lock';
import CustomPersonIcon from '../../components/CustomIcons/Person';
import routePathNames from '../../appConfig';
import CustomVerifiedIcon from '../../components/CustomIcons/Verified';
import { FETCH_ERRORS } from '../../api/fetchData';
import { useLoginMutation } from '../../hooks/useLoginMutation.hook';
import { TwoFactorType } from '../../enums/TwoFactorType';
import { usePublicTenantData } from '../../hooks/usePublicTenantData.hook';

const LoginForm = () => {
    const { data: tenantData } = usePublicTenantData();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { mutate: login } = useLoginMutation(tenantData?.id);
    const [postLoading, setPostLoading] = useState(false);
    const [otpDisabled, setOtpDisabled] = useState(true);
    const [twoFactorType, setTwoFactorType] = useState(TwoFactorType.None);

    // Function gets fired on Form Submit
    const onFinish = async (values: any) => {
        setPostLoading(true);

        login(values, {
            onSuccess: () => {
                setPostLoading(false);
                navigate('/admin');
            },
            onError: (error) => {
                if (error.message === FETCH_ERRORS.BAD_REQUEST) {
                    setOtpDisabled(false);
                    setTwoFactorType(error.options.data.otpType);
                } else {
                    message.error(t('message.error.auth.login'));
                }
                setPostLoading(false);
            },
        });
    };

    return (
        <div className="loginForm">
            <Form
                name="basic"
                labelCol={{ xs: { span: 2 } }}
                wrapperCol={{ xs: { span: 8 } }}
                initialValues={{ remember: true }}
                onFinish={onFinish}
                autoComplete="off"
                title={t('admin.login')}
                size="large"
            >
                <Form.Item
                    wrapperCol={{
                        xs: { offset: 0, span: 12 },
                        md: { offset: 2, span: 8 },
                    }}
                >
                    <Title level={2}>{t('admin.login')}</Title>
                </Form.Item>
                <Form.Item
                    label={
                        <>
                            <CustomPersonIcon />
                            <span className="labelText">{t('username')}</span>
                        </>
                    }
                    name="username"
                    rules={[
                        {
                            required: true,
                            message: t('message.form.login.username'),
                        },
                    ]}
                >
                    <Input placeholder={t('username.or.email')} />
                </Form.Item>

                <Form.Item
                    label={
                        <>
                            <CustomLockIcon />
                            <span className="labelText">{t('password')}</span>
                        </>
                    }
                    name="password"
                    rules={[{ required: true, message: t('message.form.login.password') }]}
                >
                    <Input.Password placeholder={t('password')} />
                </Form.Item>

                <Form.Item
                    label={
                        <>
                            <CustomVerifiedIcon />
                            <span className="labelText">{t('otp')}</span>
                        </>
                    }
                    name="otp"
                    rules={[{ required: !otpDisabled, message: t('message.form.login.otp') }]}
                    hidden={otpDisabled}
                    extra={t(`message.form.login.otp.${twoFactorType}`)}
                >
                    <Input placeholder={t('otp')} />
                </Form.Item>
                <Form.Item
                    wrapperCol={{
                        xs: { offset: 0, span: 12 },
                        md: { offset: 2, span: 8 },
                    }}
                >
                    {/*
                     * ATTENTION: this link will not work on local const maschines.
                     * to make them work on LIVE/DEV they link to a route "outside / above" the scope of of this admin console,
                     * but on the same host.
                     * we have 2 seperated repos / applications
                     * example:
                     * https://tenant1.onlineberatung.net/impressum is the Imprint page
                     * https://tenant1.onlineberatung.net/admin/settings ist the admin console settings page
                     *
                     */}
                    <a href={routePathNames.loginResetPasswordLink} type="link" className="forgotPW">
                        {t('password.forgot')}
                    </a>
                </Form.Item>
                <Form.Item
                    wrapperCol={{
                        xs: { offset: 0, span: 12 },
                        md: { offset: 2, span: 8 },
                    }}
                    shouldUpdate
                >
                    {({ getFieldsValue }) => {
                        const { username, password } = getFieldsValue();
                        const formIsComplete = !!username && !!password;
                        return (
                            <Button
                                block
                                type="primary"
                                htmlType="submit"
                                loading={postLoading}
                                disabled={!formIsComplete}
                            >
                                {t('message.form.login.loginBtn')}
                            </Button>
                        );
                    }}
                </Form.Item>
            </Form>
        </div>
    );
};

export default LoginForm;
