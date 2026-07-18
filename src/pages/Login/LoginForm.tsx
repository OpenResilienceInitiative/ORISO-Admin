import { useState } from 'react';
import { Form, message } from 'antd';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import InputAdornment from '@mui/material/InputAdornment';
import PersonOutlined from '@mui/icons-material/PersonOutlined';
import LockOutlined from '@mui/icons-material/LockOutlined';
import VerifiedUserOutlined from '@mui/icons-material/VerifiedUserOutlined';
import { MuiFormField, MuiPasswordFormField } from '../../components/mui/MuiFormField';
import { orisoMuiTheme } from '../../theme/orisoMuiTheme';
import routePathNames from '../../appConfig';
import { FETCH_ERRORS } from '../../api/fetchData';
import { ADMIN_PORTAL_ACCESS_DENIED, TENANT_ACCESS_DENIED, useLoginMutation } from '../../hooks/useLoginMutation.hook';
import { TwoFactorType } from '../../enums/TwoFactorType';
import { usePublicTenantData } from '../../hooks/usePublicTenantData.hook';

const startIcon = (icon: React.ReactNode) => <InputAdornment position="start">{icon}</InputAdornment>;

const LoginForm = () => {
    const { data: tenantData } = usePublicTenantData();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { mutate: login } = useLoginMutation(tenantData?.id != null ? `${tenantData.id}` : '');
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
                    setTwoFactorType(error.options?.data?.otpType || TwoFactorType.None);
                } else if (error.message === ADMIN_PORTAL_ACCESS_DENIED) {
                    message.error(t('message.error.auth.adminOnly'));
                } else if (error.message === TENANT_ACCESS_DENIED) {
                    message.error(t('message.error.auth.tenantAccessDenied'));
                } else if (error.message === FETCH_ERRORS.TIMEOUT) {
                    message.error(t('message.error.auth.network'));
                } else {
                    message.error(t('message.error.auth.login'));
                }
                setPostLoading(false);
            },
        });
    };

    return (
        <ThemeProvider theme={orisoMuiTheme}>
            <div className="loginForm">
                <Form name="basic" onFinish={onFinish} autoComplete="off" layout="vertical" requiredMark={false}>
                    <Typography variant="h5" component="h2" sx={{ fontWeight: 700, mb: 3 }}>
                        {t('admin.login')}
                    </Typography>

                    <MuiFormField
                        name="username"
                        label={t('username')}
                        placeholder={t('username.or.email')}
                        autoComplete="username"
                        startAdornment={startIcon(<PersonOutlined fontSize="small" />)}
                        rules={[{ required: true, message: t('message.form.login.username') }]}
                    />

                    <MuiPasswordFormField
                        name="password"
                        label={t('password')}
                        placeholder={t('password')}
                        autoComplete="current-password"
                        startAdornment={startIcon(<LockOutlined fontSize="small" />)}
                        rules={[{ required: true, message: t('message.form.login.password') }]}
                    />

                    {!otpDisabled && (
                        <MuiFormField
                            name="otp"
                            label={t('otp')}
                            placeholder={t('otp')}
                            startAdornment={startIcon(<VerifiedUserOutlined fontSize="small" />)}
                            helpText={t(`message.form.login.otp.${twoFactorType}`)}
                            rules={[{ required: !otpDisabled, message: t('message.form.login.otp') }]}
                        />
                    )}

                    <a href={routePathNames.passwordReset} className="forgotPW">
                        {t('password.forgot')}
                    </a>

                    <Form.Item shouldUpdate noStyle>
                        {({ getFieldsValue }) => {
                            const { username, password } = getFieldsValue();
                            const formIsComplete = !!username && !!password;
                            return (
                                <Button
                                    type="submit"
                                    variant="contained"
                                    fullWidth
                                    size="large"
                                    disabled={!formIsComplete || postLoading}
                                    startIcon={postLoading ? <CircularProgress size={18} color="inherit" /> : undefined}
                                    sx={{ mt: 2, borderRadius: '100px', textTransform: 'none' }}
                                >
                                    {t('message.form.login.loginBtn')}
                                </Button>
                            );
                        }}
                    </Form.Item>
                </Form>
            </div>
        </ThemeProvider>
    );
};

export default LoginForm;
