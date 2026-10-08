import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import less from 'less';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginForm from './LoginForm';
import m3ButtonStyles from '../../components/M3Button/styles.module.scss';
import { FETCH_ERRORS } from '../../api/fetchData';
import { ADMIN_PORTAL_ACCESS_DENIED } from '../../hooks/useLoginMutation.hook';
import { TwoFactorType } from '../../enums/TwoFactorType';

const mocks = vi.hoisted(() => ({
    login: vi.fn(),
    loginAsync: vi.fn(),
    messageError: vi.fn(),
    navigate: vi.fn(),
    search: '',
    recordLoginFailure: vi.fn(),
}));

const translations: Record<string, string> = {
    'admin.login': 'Admin login',
    username: 'Username',
    'username.or.email': 'Username/Email',
    password: 'Password',
    otp: 'One-time password',
    'password.forgot': 'Forgot password?',
    'message.form.login.loginBtn': 'Sign in',
    'message.form.login.username': 'Please enter username/email',
    'message.form.login.password': 'Please enter password',
    'message.form.login.otp': 'Please enter one-time password',
    'message.form.login.otp.EMAIL': 'Please enter the code from your email for two-factor authentication.',
    'message.form.login.otp.APP': 'Please enter the code from your app for two-factor authentication.',
    'message.error.auth.adminOnly': 'This account cannot access the admin portal. Please use an admin account.',
    'message.error.auth.login': 'Login failed. Please check username/email and password.',
    'message.error.auth.credentialsOrInvite':
        'Sign-in was not possible. Please check your username/email and password. If you were invited to this platform, please first complete your registration via the invitation link from your email.',
    'message.error.auth.tooManyCodes': 'Too many attempts. Please wait a moment before trying again.',
    'login.otp.resend.action': 'Send a new code',
    'login.otp.resend.requested': 'Request sent. Please use the newest code from your inbox.',
    'login.otp.resend.onlyNewest': 'Only the most recently sent code is valid.',
    'login.otp.resend.failed': 'The code could not be requested. Please try again.',
};

const t = (key: string, options?: Record<string, unknown>) => {
    if (key === 'message.error.auth.tooManyCodesWaitSeconds') {
        return `Too many attempts. Please wait about ${options?.seconds} seconds before trying again.`;
    }
    if (key === 'message.error.auth.tooManyCodesWaitMinutes') {
        return `Too many attempts. Please wait about ${options?.minutes} minutes before trying again.`;
    }
    if (key === 'message.error.auth.tooManyCodesWaitMinute') {
        return 'Too many attempts. Please wait about a minute before trying again.';
    }
    if (key === 'login.otp.resend.actionIn') {
        return `Send a new code (${options?.countdown})`;
    }
    return translations[key] || key;
};
let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

const STYLES_ROOT = resolve(__dirname, '../../styles');

/** Compile the real login stylesheet (its LESS variables included) to CSS. */
const compileLoginFormCss = async () => {
    const entry = readFileSync(resolve(STYLES_ROOT, 'components/loginForm.less'), 'utf8');
    const { css } = await less.render(`@import 'variables/index.less';\n${entry}`, {
        paths: [STYLES_ROOT, resolve(STYLES_ROOT, 'components')],
        filename: resolve(STYLES_ROOT, 'components/loginForm.less'),
        javascriptEnabled: true,
    });

    return css;
};

const applyCompiledLoginFormStyles = (css: string) => {
    const styleElement = document.createElement('style');
    styleElement.textContent = css;
    document.head.appendChild(styleElement);

    return () => styleElement.remove();
};

vi.mock('react-i18next', () => ({
    useTranslation: () => Object.assign([t], { t, i18n: { language: 'en' } }),
}));

/** The 400 challenge Keycloak answers a password-only token request with. */
const emailOtpChallenge = (resendAvailableInSeconds?: number) => ({
    message: FETCH_ERRORS.BAD_REQUEST,
    options: { data: { otpType: TwoFactorType.Email, resendAvailableInSeconds } },
});

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mocks.navigate,
        useLocation: () => ({ search: mocks.search }),
    };
});

vi.mock('antd', async () => {
    const actual = await vi.importActual<typeof import('antd')>('antd');
    return {
        ...actual,
        message: {
            ...actual.message,
            error: mocks.messageError,
        },
    };
});

vi.mock('../../observability/loginFailureTracker', () => ({
    recordLoginFailure: mocks.recordLoginFailure,
}));

vi.mock('../../hooks/usePublicTenantData.hook', () => ({
    usePublicTenantData: () => ({ data: { id: 42 } }),
}));

vi.mock('../../hooks/useLoginMutation.hook', async () => {
    const actual = await vi.importActual<typeof import('../../hooks/useLoginMutation.hook')>(
        '../../hooks/useLoginMutation.hook',
    );

    return {
        ...actual,
        useLoginMutation: () => ({ mutate: mocks.login, mutateAsync: mocks.loginAsync }),
    };
});

vi.mock('../../components/CustomIcons/Lock', () => ({
    default: () => <span data-testid="lock-icon" />,
}));

vi.mock('../../components/CustomIcons/Person', () => ({
    default: () => <span data-testid="person-icon" />,
}));

vi.mock('../../components/CustomIcons/Verified', () => ({
    default: () => <span data-testid="verified-icon" />,
}));

const fillRequiredFields = async () => {
    const user = userEvent.setup({ delay: null });

    await user.type(screen.getByPlaceholderText('Username/Email'), 'admin@example.com');
    await user.type(screen.getByPlaceholderText('Password'), 'correct-password');

    return user;
};

describe('LoginForm', () => {
    beforeEach(() => {
        mocks.loginAsync.mockReset();
        mocks.messageError.mockReset();
        mocks.navigate.mockReset();
        mocks.search = '';
        mocks.recordLoginFailure.mockReset();
        consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    });

    afterEach(() => {
        consoleWarnSpy.mockRestore();
    });

    it('keeps the first-centre continuation through the password and OTP challenge', async () => {
        mocks.search = '?agencySetupId=5';
        mocks.loginAsync.mockRejectedValueOnce(emailOtpChallenge()).mockResolvedValueOnce(undefined);
        render(<LoginForm />);
        const user = await fillRequiredFields();
        await user.click(screen.getByRole('button', { name: 'Sign in' }));
        expect(mocks.navigate).not.toHaveBeenCalled();
        await user.type(await screen.findByPlaceholderText('One-time password'), '123456');
        await user.click(screen.getByRole('button', { name: 'Sign in' }));
        await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith('/admin/agency/5/setup'));
    });

    it.each(['https://evil.example', 'add', '0', '5&agencySetupId=6', '1e2', '9007199254740992'])(
        'does not follow a malformed or ambiguous setup hint %s',
        async (hint) => {
            mocks.search = `?agencySetupId=${hint}`;
            mocks.loginAsync.mockResolvedValue(undefined);
            render(<LoginForm />);
            const user = await fillRequiredFields();
            await user.click(screen.getByRole('button', { name: 'Sign in' }));
            await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith('/admin'));
        },
    );

    it('links password recovery to the admin-owned reset flow', () => {
        render(<LoginForm />);

        expect(screen.getByRole('link', { name: 'Forgot password?' })).toHaveAttribute('href', '/admin/password-reset');
    });

    /*
     * Owner review of predev.example.org/admin, "Muss zentrierter sein": the
     * password-reset link was the only child of the sign-in form that did not
     * share the axis of the fields and the submit button — it hugged the inline
     * start ~100px left of the form centre.
     *
     * jsdom has no layout engine, so this compiles the stylesheet the app really
     * ships (variables + styles/components/loginForm.less) and applies it to the
     * really rendered form: the assertion then runs through the actual cascade,
     * which is what decides the link's horizontal placement. A shrink-to-fit box
     * only centres when it is block-level AND both inline margins resolve to
     * `auto` — `auto` on an inline-level box is inert, which is exactly the
     * shipped bug — so both halves of that mechanism are asserted.
     */
    it('centres the password-reset link on the axis the fields and the submit button share', async () => {
        const removeStylesheet = applyCompiledLoginFormStyles(await compileLoginFormCss());

        try {
            render(<LoginForm />);
            const link = screen.getByRole('link', { name: 'Forgot password?' });
            const style = window.getComputedStyle(link);

            expect(['inline', 'inline-block']).not.toContain(style.display);
            expect(style.marginLeft).toBe('auto');
            expect(style.marginRight).toBe('auto');
        } finally {
            removeStylesheet();
        }
    });

    /*
     * Owner review, "Scheint keine Color Token Secondary zu haben": the sign-in
     * action was a raw MUI `<Button variant="contained">` whose colour came from
     * the hardcoded `#273270` in theme/orisoMuiTheme.ts — the legacy antd navy
     * that theme/antdM3Theme.ts retired everywhere else — and which therefore
     * also inherited MUI's own resting elevation and its untokenised disabled
     * grey. The public surface's own primary submit (TenantOnboarding /
     * OrganisationDpaStep) is the shared M3 filled button; the sign-in action
     * has to be the same control, so its colour comes from --m3-primary /
     * --m3-on-primary and it is flat at rest.
     */
    it('renders sign in as the shared M3 filled button, not a raw MUI contained button', () => {
        render(<LoginForm />);

        const signInButton = screen.getByRole('button', { name: 'Sign in' });

        expect(signInButton).toHaveClass(m3ButtonStyles.filled);
        expect(signInButton.className).not.toMatch(/MuiButton-contained/);
    });

    it('keeps the full-width submit block and the busy state on the shared button', async () => {
        mocks.loginAsync.mockReturnValue(
            // a request that never answers: the button has to stay in its busy state
            new Promise(() => {
                /* never settles */
            }),
        );
        render(<LoginForm />);
        const user = await fillRequiredFields();

        const signInButton = screen.getByRole('button', { name: 'Sign in' });
        expect(signInButton).toHaveClass(m3ButtonStyles.block);

        await user.click(signInButton);

        await waitFor(() => {
            expect(screen.getByRole('button', { name: 'Sign in' })).toHaveAttribute('aria-busy', 'true');
        });
        expect(screen.getByRole('button', { name: 'Sign in' })).toBeDisabled();
    });

    it('keeps sign in disabled until username and password are entered', async () => {
        const user = userEvent.setup({ delay: null });
        render(<LoginForm />);

        const signInButton = screen.getByRole('button', { name: 'Sign in' });
        expect(signInButton).toBeDisabled();

        await user.type(screen.getByPlaceholderText('Username/Email'), 'admin@example.com');
        expect(signInButton).toBeDisabled();

        await user.type(screen.getByPlaceholderText('Password'), 'correct-password');
        expect(signInButton).toBeEnabled();
    });

    it('submits the entered username and password to the login mutation', async () => {
        render(<LoginForm />);
        const user = await fillRequiredFields();

        await user.click(screen.getByRole('button', { name: 'Sign in' }));

        await waitFor(() => {
            expect(mocks.loginAsync).toHaveBeenCalledWith(
                expect.objectContaining({
                    password: 'correct-password',
                    username: 'admin@example.com',
                }),
            );
        });
    });

    it('navigates to the admin area after a successful login', async () => {
        mocks.loginAsync.mockResolvedValue(undefined);
        render(<LoginForm />);
        const user = await fillRequiredFields();

        await user.click(screen.getByRole('button', { name: 'Sign in' }));

        await waitFor(() => {
            expect(mocks.navigate).toHaveBeenCalledWith('/admin');
        });
    });

    // TEN-INV-U10 (#572): invalid credentials and a not-yet-registered invitee get ONE
    // combined, privacy-preserving inline hint — the form must not reveal whether the
    // account exists (no user enumeration), and no generic toast fires for this case.
    it('shows the combined credentials-or-invite hint for invalid credentials', async () => {
        mocks.loginAsync.mockRejectedValue(new Error(FETCH_ERRORS.UNAUTHORIZED));
        render(<LoginForm />);
        const user = await fillRequiredFields();

        await user.click(screen.getByRole('button', { name: 'Sign in' }));

        expect(await screen.findByRole('alert')).toHaveTextContent(
            'Sign-in was not possible. Please check your username/email and password. If you were invited to this platform, please first complete your registration via the invitation link from your email.',
        );
        expect(mocks.messageError).not.toHaveBeenCalled();
    });

    it('shows the exact same hint for a not-yet-registered account (no user enumeration)', async () => {
        mocks.loginAsync.mockRejectedValue(new Error('some-unknown-auth-failure'));
        render(<LoginForm />);
        const user = await fillRequiredFields();

        await user.click(screen.getByRole('button', { name: 'Sign in' }));

        expect(await screen.findByRole('alert')).toHaveTextContent(
            'Sign-in was not possible. Please check your username/email and password. If you were invited to this platform, please first complete your registration via the invitation link from your email.',
        );
        expect(mocks.messageError).not.toHaveBeenCalled();
    });

    it('clears the credentials hint when the login is retried', async () => {
        mocks.loginAsync.mockRejectedValueOnce(new Error(FETCH_ERRORS.UNAUTHORIZED));
        render(<LoginForm />);
        const user = await fillRequiredFields();

        await user.click(screen.getByRole('button', { name: 'Sign in' }));
        expect(await screen.findByTestId('login-credentials-hint')).toBeInTheDocument();

        // Second submit: mutation stays pending — the stale hint must disappear.
        await user.click(screen.getByRole('button', { name: 'Sign in' }));

        await waitFor(() => {
            expect(screen.queryByTestId('login-credentials-hint')).not.toBeInTheDocument();
        });
    });

    it('shows an admin-only error message when the account has no admin portal access', async () => {
        mocks.loginAsync.mockRejectedValue(new Error(ADMIN_PORTAL_ACCESS_DENIED));
        render(<LoginForm />);
        const user = await fillRequiredFields();

        await user.click(screen.getByRole('button', { name: 'Sign in' }));

        await waitFor(() => {
            expect(mocks.messageError).toHaveBeenCalledWith(
                'This account cannot access the admin portal. Please use an admin account.',
            );
        });
    });

    it('reveals and validates the OTP field when two-factor authentication is required', async () => {
        mocks.loginAsync.mockRejectedValueOnce({
            message: FETCH_ERRORS.BAD_REQUEST,
            options: { data: { otpType: TwoFactorType.Email } },
        });
        render(<LoginForm />);
        const user = await fillRequiredFields();

        await user.click(screen.getByRole('button', { name: 'Sign in' }));

        expect(await screen.findByPlaceholderText('One-time password')).toBeInTheDocument();
        expect(
            screen.getByText('Please enter the code from your email for two-factor authentication.'),
        ).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Sign in' }));

        expect(await screen.findByText('Please enter one-time password')).toBeInTheDocument();
    });

    // Keycloak answers a wrong password with 400 invalid_grant and NO otpType.
    // Until 2026-09 this branch revealed the OTP field and said nothing, so a
    // plain typo in the password looked like a dead button (ORISO-Frontend#1402
    // has the same symptom on the app layer).
    it('shows the credentials hint, not the OTP field, for a 400 without an OTP type', async () => {
        mocks.loginAsync.mockRejectedValueOnce({
            message: FETCH_ERRORS.BAD_REQUEST,
            options: { data: { error: 'invalid_grant', error_description: 'Invalid user credentials' } },
        });
        render(<LoginForm />);
        const user = await fillRequiredFields();

        await user.click(screen.getByRole('button', { name: 'Sign in' }));

        expect(await screen.findByTestId('login-credentials-hint')).toBeInTheDocument();
        expect(screen.queryByPlaceholderText('One-time password')).not.toBeInTheDocument();
        expect(mocks.messageError).not.toHaveBeenCalled();
    });

    it('shows the credentials hint when the code was submitted and Keycloak still answers 400', async () => {
        mocks.loginAsync
            .mockRejectedValueOnce({
                message: FETCH_ERRORS.BAD_REQUEST,
                options: { data: { otpType: TwoFactorType.App } },
            })
            .mockRejectedValueOnce({
                message: FETCH_ERRORS.BAD_REQUEST,
                options: { data: { error: 'invalid_grant', error_description: 'Invalid user credentials' } },
            });
        render(<LoginForm />);
        const user = await fillRequiredFields();

        await user.click(screen.getByRole('button', { name: 'Sign in' }));
        const otpField = await screen.findByPlaceholderText('One-time password');
        await user.type(otpField, '123456');
        await user.click(screen.getByRole('button', { name: 'Sign in' }));

        expect(await screen.findByTestId('login-credentials-hint')).toBeInTheDocument();
        // The OTP field stays so the person can correct the code, not start over.
        expect(screen.getByPlaceholderText('One-time password')).toBeInTheDocument();
    });

    /*
     * ORISO-UserService#1338. The admin login had no way to ask for a new code:
     * an expired code — or a second login tab, which silently invalidates the
     * first code — meant reloading and typing the password again. The code field
     * is `required`, so the link must NOT go through the form's submit, or the
     * form would stop at its own "please enter one-time password" instead.
     */
    it('offers a resend link once the realm asked for an e-mail code', async () => {
        mocks.loginAsync.mockRejectedValueOnce(emailOtpChallenge());
        render(<LoginForm />);
        const user = await fillRequiredFields();

        expect(screen.queryByRole('button', { name: 'Send a new code' })).not.toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Sign in' }));

        expect(await screen.findByRole('button', { name: 'Send a new code' })).toBeInTheDocument();
        expect(screen.getByText('Only the most recently sent code is valid.')).toBeInTheDocument();
    });

    it('asks for a new code without a code and without tripping the required rule', async () => {
        mocks.loginAsync.mockRejectedValueOnce(emailOtpChallenge());
        render(<LoginForm />);
        const user = await fillRequiredFields();
        await user.click(screen.getByRole('button', { name: 'Sign in' }));
        await screen.findByRole('button', { name: 'Send a new code' });

        mocks.loginAsync.mockRejectedValueOnce(emailOtpChallenge(30));
        await user.click(screen.getByRole('button', { name: 'Send a new code' }));

        expect(mocks.loginAsync).toHaveBeenCalledWith({
            username: 'admin@example.com',
            password: 'correct-password',
            otp: '',
        });
        // the form's own validation never ran, so it cannot block the request
        expect(screen.queryByText('Please enter one-time password')).not.toBeInTheDocument();
        expect(await screen.findByRole('status')).toHaveTextContent('Request sent.');
    });

    it('counts down with the seconds the realm reported', async () => {
        mocks.loginAsync.mockRejectedValueOnce(emailOtpChallenge(90));
        render(<LoginForm />);
        const user = await fillRequiredFields();

        await user.click(screen.getByRole('button', { name: 'Sign in' }));

        expect(await screen.findByRole('button', { name: 'Send a new code (1:30)' })).toBeDisabled();
    });

    // Both 429 cases ("too many codes requested" and "code guessed too often") used
    // to arrive as TIMEOUT and read as "the server is unreachable", which is wrong
    // advice: reloading and retyping makes it worse, waiting is the answer.
    it('says how long to wait instead of blaming the network on a 429', async () => {
        mocks.loginAsync.mockRejectedValueOnce({
            message: FETCH_ERRORS.TOO_MANY_REQUESTS,
            options: { data: { otpType: TwoFactorType.Email, resendAvailableInSeconds: 420 } },
        });
        render(<LoginForm />);
        const user = await fillRequiredFields();

        await user.click(screen.getByRole('button', { name: 'Sign in' }));

        await waitFor(() => {
            expect(mocks.messageError).toHaveBeenCalledWith(
                'Too many attempts. Please wait about 7 minutes before trying again.',
            );
        });
        expect(mocks.recordLoginFailure).toHaveBeenCalledWith({
            outcome: 'rate_limited',
            transport: 'too_many_requests',
            stage: 'password',
        });
        expect(screen.queryByTestId('login-credentials-hint')).not.toBeInTheDocument();
    });

    it('quotes a short wait in seconds, not as "1 minutes"', async () => {
        // resendAvailableInSeconds carries the 30 s cooldown as well as the
        // remainder of a 15 min window; rounding both up to minutes doubled the
        // short one and read as "1 minutes"
        mocks.loginAsync.mockRejectedValueOnce({
            message: FETCH_ERRORS.TOO_MANY_REQUESTS,
            options: { data: { resendAvailableInSeconds: 27 } },
        });
        render(<LoginForm />);
        const user = await fillRequiredFields();

        await user.click(screen.getByRole('button', { name: 'Sign in' }));

        await waitFor(() => {
            expect(mocks.messageError).toHaveBeenCalledWith(
                'Too many attempts. Please wait about 27 seconds before trying again.',
            );
        });
    });

    it('says "about a minute" rather than "1 minutes"', async () => {
        mocks.loginAsync.mockRejectedValueOnce({
            message: FETCH_ERRORS.TOO_MANY_REQUESTS,
            options: { data: { resendAvailableInSeconds: 60 } },
        });
        render(<LoginForm />);
        const user = await fillRequiredFields();

        await user.click(screen.getByRole('button', { name: 'Sign in' }));

        await waitFor(() => {
            expect(mocks.messageError).toHaveBeenCalledWith(
                'Too many attempts. Please wait about a minute before trying again.',
            );
        });
    });

    it('rounds the quoted wait up, never down to a link that is still counting', async () => {
        // 89 s rounded to "a minute" sends the user back to a link with 29 s left,
        // and that refused click is the thing this message exists to prevent
        mocks.loginAsync.mockRejectedValueOnce({
            message: FETCH_ERRORS.TOO_MANY_REQUESTS,
            options: { data: { resendAvailableInSeconds: 89 } },
        });
        render(<LoginForm />);
        const user = await fillRequiredFields();

        await user.click(screen.getByRole('button', { name: 'Sign in' }));

        await waitFor(() => {
            expect(mocks.messageError).toHaveBeenCalledWith(
                'Too many attempts. Please wait about 2 minutes before trying again.',
            );
        });
    });

    it('falls back to the wait-a-moment wording when the realm reports no seconds', async () => {
        mocks.loginAsync.mockRejectedValueOnce({ message: FETCH_ERRORS.TOO_MANY_REQUESTS, options: { data: {} } });
        render(<LoginForm />);
        const user = await fillRequiredFields();

        await user.click(screen.getByRole('button', { name: 'Sign in' }));

        await waitFor(() => {
            expect(mocks.messageError).toHaveBeenCalledWith(
                'Too many attempts. Please wait a moment before trying again.',
            );
        });
    });

    it('shows the rate-limit message once, not a second generic line under the link', async () => {
        mocks.loginAsync.mockRejectedValueOnce(emailOtpChallenge());
        render(<LoginForm />);
        const user = await fillRequiredFields();
        await user.click(screen.getByRole('button', { name: 'Sign in' }));
        await screen.findByRole('button', { name: 'Send a new code' });

        mocks.loginAsync.mockRejectedValueOnce({
            message: FETCH_ERRORS.TOO_MANY_REQUESTS,
            options: { data: { resendAvailableInSeconds: 600 } },
        });
        await user.click(screen.getByRole('button', { name: 'Send a new code' }));

        await waitFor(() => {
            expect(mocks.messageError).toHaveBeenCalledWith(
                'Too many attempts. Please wait about 10 minutes before trying again.',
            );
        });
        expect(screen.queryByText('The code could not be requested. Please try again.')).not.toBeInTheDocument();
        // The realm's 600 s is what the link counts down, not the 30 s fallback.
        // Matched as a range because the countdown ticks while the test runs — an
        // exact "10:00" is a stopwatch race, not an assertion about behaviour.
        const resendLink = await screen.findByRole('button', {
            name: /^Send a new code \(9:5\d|^Send a new code \(10:00/,
        });
        expect(resendLink).toBeDisabled();
    });

    it('reports a failed resend request under the link', async () => {
        mocks.loginAsync.mockRejectedValueOnce(emailOtpChallenge());
        render(<LoginForm />);
        const user = await fillRequiredFields();
        await user.click(screen.getByRole('button', { name: 'Sign in' }));
        await screen.findByRole('button', { name: 'Send a new code' });

        mocks.loginAsync.mockRejectedValueOnce({ message: FETCH_ERRORS.TIMEOUT });
        await user.click(screen.getByRole('button', { name: 'Send a new code' }));

        expect(await screen.findByText('The code could not be requested. Please try again.')).toBeInTheDocument();
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    /*
     * Riccardo's review of PR #1125: a fresh sign-in that walks straight into the
     * per-window ceiling gets a 429 that still names `otpType: EMAIL`. The ceiling
     * only refuses NEW mails — the code from the previous attempt is still valid —
     * so hiding the field locked out the one user who could have signed in.
     */
    it('still lets the held code be entered when the ceiling answers the password', async () => {
        mocks.loginAsync.mockRejectedValueOnce({
            message: FETCH_ERRORS.TOO_MANY_REQUESTS,
            options: { data: { otpType: TwoFactorType.Email, resendAvailableInSeconds: 600 } },
        });
        render(<LoginForm />);
        const user = await fillRequiredFields();
        await user.click(screen.getByRole('button', { name: 'Sign in' }));

        const otpField = await screen.findByPlaceholderText('One-time password');
        // the wait is quoted, and the link stays dead while it runs
        await waitFor(() => {
            expect(mocks.messageError).toHaveBeenCalledWith(
                'Too many attempts. Please wait about 10 minutes before trying again.',
            );
        });
        expect(screen.getByRole('button', { name: /^Send a new code \(/ })).toBeDisabled();

        mocks.loginAsync.mockResolvedValueOnce(undefined);
        await user.type(otpField, '123456');
        await user.click(screen.getByRole('button', { name: 'Sign in' }));

        expect(mocks.loginAsync).toHaveBeenLastCalledWith(expect.objectContaining({ otp: '123456' }));
        await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith('/admin'));
    });

    it('still reports the code submission when a resend overtakes it', async () => {
        // TanStack Query keeps per-call callbacks for the newest call only. While the
        // form submitted through them, a resend clicked mid-flight silenced the code
        // submission: the spinner kept turning, a wrong code said nothing, and a right
        // one did not sign the user in.
        mocks.loginAsync.mockRejectedValueOnce(emailOtpChallenge());
        render(<LoginForm />);
        const user = await fillRequiredFields();
        await user.click(screen.getByRole('button', { name: 'Sign in' }));

        const otpField = await screen.findByPlaceholderText('One-time password');
        let answerTheCode: (error: unknown) => void = () => undefined;
        mocks.loginAsync.mockImplementationOnce(
            () =>
                new Promise((_resolve, reject) => {
                    answerTheCode = reject;
                }),
        );
        await user.type(otpField, '123456');
        await user.click(screen.getByRole('button', { name: 'Sign in' }));

        // the resend overtakes the code submission, which is still travelling
        mocks.loginAsync.mockRejectedValueOnce(emailOtpChallenge(30));
        await user.click(screen.getByRole('button', { name: 'Send a new code' }));
        await screen.findByRole('status');

        await act(async () => {
            answerTheCode({ message: FETCH_ERRORS.BAD_REQUEST, options: { data: {} } });
        });

        expect(await screen.findByTestId('login-credentials-hint')).toBeInTheDocument();
    });

    it('offers no resend link for an authenticator-app code', async () => {
        // nothing to resend: the code is generated on the device
        mocks.loginAsync.mockRejectedValueOnce({
            message: FETCH_ERRORS.BAD_REQUEST,
            options: { data: { otpType: TwoFactorType.App } },
        });
        render(<LoginForm />);
        const user = await fillRequiredFields();

        await user.click(screen.getByRole('button', { name: 'Sign in' }));

        await screen.findByPlaceholderText('One-time password');
        expect(screen.queryByRole('button', { name: 'Send a new code' })).not.toBeInTheDocument();
    });

    it('counts every failure for SigNoz without any identifying attribute', async () => {
        mocks.loginAsync.mockRejectedValueOnce(new Error(FETCH_ERRORS.UNAUTHORIZED));
        render(<LoginForm />);
        const user = await fillRequiredFields();

        await user.click(screen.getByRole('button', { name: 'Sign in' }));

        await screen.findByTestId('login-credentials-hint');
        expect(mocks.recordLoginFailure).toHaveBeenCalledTimes(1);
        expect(mocks.recordLoginFailure).toHaveBeenCalledWith({
            outcome: 'credentials',
            transport: 'unauthorized',
            stage: 'password',
        });
    });
});
