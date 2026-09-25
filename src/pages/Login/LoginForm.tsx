import { useState } from 'react';
import { Form, message } from 'antd';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';
import PersonOutlined from '@mui/icons-material/PersonOutlined';
import LockOutlined from '@mui/icons-material/LockOutlined';
import VerifiedUserOutlined from '@mui/icons-material/VerifiedUserOutlined';
import { M3Button } from '../../components/M3Button';
import { MuiFormField, MuiPasswordFormField } from '../../components/mui/MuiFormField';
import { orisoMuiTheme } from '../../theme/orisoMuiTheme';
import routePathNames from '../../appConfig';
import { FETCH_ERRORS } from '../../api/fetchData';
import { LoginFailureTransport, recordLoginFailure } from '../../observability/loginFailureTracker';
import { ADMIN_PORTAL_ACCESS_DENIED, TENANT_ACCESS_DENIED, useLoginMutation } from '../../hooks/useLoginMutation.hook';
import { TwoFactorType } from '../../enums/TwoFactorType';
import { usePublicTenantData } from '../../hooks/usePublicTenantData.hook';
import { LoginCredentialsHint } from './LoginCredentialsHint';

const startIcon = (icon: React.ReactNode) => <InputAdornment position="start">{icon}</InputAdornment>;

const LoginForm = () => {
    const { data: tenantData } = usePublicTenantData();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { mutate: login } = useLoginMutation(tenantData?.id != null ? `${tenantData.id}` : '');
    const [postLoading, setPostLoading] = useState(false);
    const [showCredentialsHint, setShowCredentialsHint] = useState(false);
    const [otpDisabled, setOtpDisabled] = useState(true);
    const [twoFactorType, setTwoFactorType] = useState(TwoFactorType.None);
    const otpHelpTextKey =
        twoFactorType === TwoFactorType.None ? 'message.form.login.otp' : `message.form.login.otp.${twoFactorType}`;

    const describeTransport = (errorMessage: string): LoginFailureTransport => {
        if (errorMessage === FETCH_ERRORS.BAD_REQUEST) {
            return 'bad_request';
        }
        if (errorMessage === FETCH_ERRORS.UNAUTHORIZED) {
            return 'unauthorized';
        }
        return 'unexpected';
    };

    // Function gets fired on Form Submit
    const onFinish = async (values: any) => {
        setPostLoading(true);
        setShowCredentialsHint(false);

        login(values, {
            onSuccess: () => {
                setPostLoading(false);
                navigate('/admin');
            },
            onError: (error) => {
                const otpType = error.options?.data?.otpType;
                const otpSubmitted = Boolean(values?.otp);
                const stage = otpSubmitted ? 'otp' : 'password';
                if (error.message === FETCH_ERRORS.BAD_REQUEST && otpType && !otpSubmitted) {
                    // The password was right, the realm asks for the second factor.
                    setOtpDisabled(false);
                    setTwoFactorType(otpType);
                    recordLoginFailure({ outcome: 'otp_required', transport: 'bad_request', stage });
                } else if (error.message === ADMIN_PORTAL_ACCESS_DENIED) {
                    message.error(t('message.error.auth.adminOnly'));
                    recordLoginFailure({ outcome: 'access_denied', transport: 'unexpected', stage });
                } else if (error.message === TENANT_ACCESS_DENIED) {
                    message.error(t('message.error.auth.tenantAccessDenied'));
                    recordLoginFailure({ outcome: 'access_denied', transport: 'unexpected', stage });
                } else if (error.message === FETCH_ERRORS.TIMEOUT) {
                    message.error(t('message.error.auth.network'));
                    recordLoginFailure({ outcome: 'unavailable', transport: 'network', stage });
                } else {
                    // TEN-INV-U10 (#572): invalid credentials and a not-yet-registered
                    // invitee get ONE combined, privacy-preserving hint — deliberately
                    // not distinguishable, so the form cannot be used to enumerate
                    // whether an account exists. (A successful login with a missing DPA
                    // never lands here: it authenticates and hits the global blocker.)
                    //
                    // Keycloak reports a wrong password AND a wrong one-time code as
                    // 400 invalid_grant "Invalid user credentials" without an otpType.
                    // Until 2026-09 that 400 silently revealed the OTP field instead of
                    // saying anything, so a plain typo looked like a dead button.
                    setShowCredentialsHint(true);
                    recordLoginFailure({ outcome: 'credentials', transport: describeTransport(error.message), stage });
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
                            helpText={t(otpHelpTextKey)}
                            rules={[{ required: !otpDisabled, message: t('message.form.login.otp') }]}
                        />
                    )}

                    {showCredentialsHint && <LoginCredentialsHint />}

                    <a href={routePathNames.passwordReset} className="forgotPW">
                        {t('password.forgot')}
                    </a>

                    <Form.Item shouldUpdate noStyle>
                        {({ getFieldsValue }) => {
                            const { username, password } = getFieldsValue();
                            const formIsComplete = !!username && !!password;
                            return (
                                // The public surface's shared primary action — the same
                                // control the tenant-admin onboarding submits with (see
                                // TenantOnboarding/OrganisationDpaStep). It carries the
                                // M3 filled treatment (--m3-primary / --m3-on-primary,
                                // flat at rest, state-layer hover, visible focus ring)
                                // instead of MUI's default contained button, whose
                                // colour came from the hardcoded #273270 in
                                // theme/orisoMuiTheme.ts and whose resting elevation
                                // made it read as a stuck hover state.
                                <M3Button
                                    type="submit"
                                    variant="filled"
                                    block
                                    className="loginSubmit"
                                    disabled={!formIsComplete}
                                    loading={postLoading}
                                >
                                    {t('message.form.login.loginBtn')}
                                </M3Button>
                            );
                        }}
                    </Form.Item>
                </Form>
            </div>
        </ThemeProvider>
    );
};

export default LoginForm;
