import { useState } from 'react';
import { Form, message } from 'antd';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
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
import { agencySetupFromSearch } from '../../constants/agencySetupContinuation';
import { FETCH_ERRORS } from '../../api/fetchData';
import { LoginFailureTransport, recordLoginFailure } from '../../observability/loginFailureTracker';
import {
    ADMIN_PORTAL_ACCESS_DENIED,
    ErrorLogin,
    TENANT_ACCESS_DENIED,
    useLoginMutation,
} from '../../hooks/useLoginMutation.hook';
import { TwoFactorType } from '../../enums/TwoFactorType';
import { usePublicTenantData } from '../../hooks/usePublicTenantData.hook';
import { LoginCredentialsHint } from './LoginCredentialsHint';
import OtpResendLink, { RESEND_ERROR_ALREADY_SHOWN, RESEND_NOT_ATTEMPTED, ResendError } from './OtpResendLink';

const startIcon = (icon: React.ReactNode) => <InputAdornment position="start">{icon}</InputAdornment>;

/**
 * The wait, in the unit it actually has. `resendAvailableInSeconds` carries both
 * the 30 second cooldown and the remainder of a 15 minute window, so one fixed
 * unit is wrong half the time — and rounding 27 seconds up to "1 minutes" was
 * both ungrammatical and twice the real wait.
 *
 * Minutes round UP. Rounding 89 seconds to "about a minute" would send the user
 * back to a link that is still counting down 29 seconds, and that refusal is
 * exactly what this message exists to prevent.
 */
const waitMessage = (seconds: number): [string, Record<string, number>] => {
    if (seconds < 60) {
        return ['message.error.auth.tooManyCodesWaitSeconds', { seconds }];
    }
    const minutes = Math.max(1, Math.ceil(seconds / 60));
    return minutes === 1
        ? ['message.error.auth.tooManyCodesWaitMinute', {}]
        : ['message.error.auth.tooManyCodesWaitMinutes', { minutes }];
};

const positiveSeconds = (value: unknown): number | undefined =>
    typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined;

const LoginForm = () => {
    const [form] = Form.useForm();
    const { data: tenantData } = usePublicTenantData();
    const navigate = useNavigate();
    const { search } = useLocation();
    const successDestination = agencySetupFromSearch(search) ?? routePathNames.root;
    const { t } = useTranslation();
    const { mutateAsync: loginAsync } = useLoginMutation(tenantData?.id != null ? `${tenantData.id}` : '');
    const [postLoading, setPostLoading] = useState(false);
    const [showCredentialsHint, setShowCredentialsHint] = useState(false);
    const [otpDisabled, setOtpDisabled] = useState(true);
    const [twoFactorType, setTwoFactorType] = useState(TwoFactorType.None);
    // What the realm last said about asking for another code (#1338). Undefined
    // against a realm that does not report it; the link then uses its own fallback.
    const [resendCooldownSeconds, setResendCooldownSeconds] = useState<number | undefined>(undefined);
    const otpHelpTextKey =
        twoFactorType === TwoFactorType.None ? 'message.form.login.otp' : `message.form.login.otp.${twoFactorType}`;

    const describeTransport = (errorMessage: string): LoginFailureTransport => {
        if (errorMessage === FETCH_ERRORS.BAD_REQUEST) {
            return 'bad_request';
        }
        if (errorMessage === FETCH_ERRORS.TOO_MANY_REQUESTS) {
            return 'too_many_requests';
        }
        if (errorMessage === FETCH_ERRORS.UNAUTHORIZED) {
            return 'unauthorized';
        }
        return 'unexpected';
    };

    /** A 429 means "wait", never "wrong password" — say so, and count it as its own outcome. */
    const handleRateLimited = (error: ErrorLogin, stage: 'password' | 'otp') => {
        const seconds = positiveSeconds(error.options?.data?.resendAvailableInSeconds);
        const [key, values] = seconds ? waitMessage(seconds) : ['message.error.auth.tooManyCodes', {}];
        message.error(t(key, values));
        recordLoginFailure({ outcome: 'rate_limited', transport: 'too_many_requests', stage });
    };

    /**
     * Asks the realm for another code (#1338). It submits username and password
     * WITHOUT a code, deliberately not through the form: the code field is
     * `required`, so a form submit would stop at its own validation message and the
     * user could never ask for a replacement for the code they are missing.
     *
     * It awaits the mutation rather than passing per-call callbacks. TanStack Query
     * hands those to the newest `mutate` only, so a sign-in started while a resend
     * is still in flight drops the resend's own callbacks — and the link, waiting
     * for one, would stay greyed out for the rest of the session.
     *
     * Resolves when the realm answered the code challenge — that is the same 400 the
     * first login attempt got. Rejects otherwise, so the link can say so.
     */
    const resendCode = async (): Promise<number | void> => {
        const { username, password } = form.getFieldsValue();
        if (!username || !password) {
            throw new ResendError(RESEND_NOT_ATTEMPTED);
        }

        try {
            await loginAsync({ username, password, otp: '' });
            // A realm that stopped asking for a second factor mid-session:
            // nothing to resend, the user is simply in.
            navigate(successDestination);
            return undefined;
        } catch (caught) {
            const error = caught as ErrorLogin;
            const waitSeconds = positiveSeconds(error.options?.data?.resendAvailableInSeconds);
            setResendCooldownSeconds(waitSeconds);
            if (error.message === FETCH_ERRORS.BAD_REQUEST && error.options?.data?.otpType) {
                return waitSeconds;
            }
            if (error.message === FETCH_ERRORS.TOO_MANY_REQUESTS) {
                handleRateLimited(error, 'password');
                throw new ResendError(RESEND_ERROR_ALREADY_SHOWN, waitSeconds);
            }
            throw new ResendError(error.message, waitSeconds);
        }
    };

    /**
     * The form's own submit. It awaits the mutation for the same reason the resend
     * link does: TanStack Query keeps per-call callbacks for the newest call only,
     * so a resend clicked while the code submission is still travelling used to
     * silence that submission — the spinner kept turning, no error was shown, and a
     * correct code did not sign the user in.
     */
    const onFinish = async (values: any) => {
        setPostLoading(true);
        setShowCredentialsHint(false);

        try {
            await loginAsync(values);
            navigate(successDestination);
        } catch (caught) {
            const error = caught as ErrorLogin;
            const otpType = error.options?.data?.otpType;
            const otpSubmitted = Boolean(values?.otp);
            const stage = otpSubmitted ? 'otp' : 'password';
            setResendCooldownSeconds(positiveSeconds(error.options?.data?.resendAvailableInSeconds));
            if (error.message === FETCH_ERRORS.BAD_REQUEST && otpType && !otpSubmitted) {
                // The password was right, the realm asks for the second factor.
                setOtpDisabled(false);
                setTwoFactorType(otpType);
                recordLoginFailure({ outcome: 'otp_required', transport: 'bad_request', stage });
            } else if (error.message === FETCH_ERRORS.TOO_MANY_REQUESTS) {
                // #1338: either too many code mails inside the window, or a code
                // guessed too often. This used to read as a network failure.
                handleRateLimited(error, stage);
                if (!otpSubmitted && otpType) {
                    // The ceiling refuses NEW code mails; the one already in the
                    // inbox stays valid. Keeping the field hidden here locks out
                    // the very user who can still sign in.
                    setOtpDisabled(false);
                    setTwoFactorType(otpType);
                }
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
        } finally {
            setPostLoading(false);
        }
    };

    return (
        <ThemeProvider theme={orisoMuiTheme}>
            <div className="loginForm">
                <Form
                    form={form}
                    name="basic"
                    onFinish={onFinish}
                    autoComplete="off"
                    layout="vertical"
                    requiredMark={false}
                >
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

                    {!otpDisabled && twoFactorType === TwoFactorType.Email && (
                        <OtpResendLink onResend={resendCode} cooldownSeconds={resendCooldownSeconds} />
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
