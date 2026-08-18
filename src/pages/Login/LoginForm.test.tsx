import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import less from 'less';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginForm from './LoginForm';
import m3ButtonStyles from '../../components/M3Button/styles.module.scss';
import { FETCH_ERRORS } from '../../api/fetchData';
import { ADMIN_PORTAL_ACCESS_DENIED } from '../../hooks/useLoginMutation.hook';
import { TwoFactorType } from '../../enums/TwoFactorType';

const mocks = vi.hoisted(() => ({
    login: vi.fn(),
    messageError: vi.fn(),
    navigate: vi.fn(),
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
};

const t = (key: string) => translations[key] || key;
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

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mocks.navigate,
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

vi.mock('../../hooks/usePublicTenantData.hook', () => ({
    usePublicTenantData: () => ({ data: { id: 42 } }),
}));

vi.mock('../../hooks/useLoginMutation.hook', async () => {
    const actual = await vi.importActual<typeof import('../../hooks/useLoginMutation.hook')>(
        '../../hooks/useLoginMutation.hook',
    );

    return {
        ...actual,
        useLoginMutation: () => ({ mutate: mocks.login }),
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
        mocks.login.mockReset();
        mocks.messageError.mockReset();
        mocks.navigate.mockReset();
        consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    });

    afterEach(() => {
        consoleWarnSpy.mockRestore();
    });

    it('links password recovery to the admin-owned reset flow', () => {
        render(<LoginForm />);

        expect(screen.getByRole('link', { name: 'Forgot password?' })).toHaveAttribute('href', '/admin/password-reset');
    });

    /*
     * Owner review of predev.oriso.org/admin, "Muss zentrierter sein": the
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
        mocks.login.mockImplementation(() => undefined);
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
            expect(mocks.login).toHaveBeenCalledWith(
                expect.objectContaining({
                    password: 'correct-password',
                    username: 'admin@example.com',
                }),
                expect.objectContaining({
                    onError: expect.any(Function),
                    onSuccess: expect.any(Function),
                }),
            );
        });
    });

    it('navigates to the admin area after a successful login', async () => {
        mocks.login.mockImplementation((_values, options) => options.onSuccess());
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
        mocks.login.mockImplementation((_values, options) => options.onError(new Error(FETCH_ERRORS.UNAUTHORIZED)));
        render(<LoginForm />);
        const user = await fillRequiredFields();

        await user.click(screen.getByRole('button', { name: 'Sign in' }));

        expect(await screen.findByRole('alert')).toHaveTextContent(
            'Sign-in was not possible. Please check your username/email and password. If you were invited to this platform, please first complete your registration via the invitation link from your email.',
        );
        expect(mocks.messageError).not.toHaveBeenCalled();
    });

    it('shows the exact same hint for a not-yet-registered account (no user enumeration)', async () => {
        mocks.login.mockImplementation((_values, options) => options.onError(new Error('some-unknown-auth-failure')));
        render(<LoginForm />);
        const user = await fillRequiredFields();

        await user.click(screen.getByRole('button', { name: 'Sign in' }));

        expect(await screen.findByRole('alert')).toHaveTextContent(
            'Sign-in was not possible. Please check your username/email and password. If you were invited to this platform, please first complete your registration via the invitation link from your email.',
        );
        expect(mocks.messageError).not.toHaveBeenCalled();
    });

    it('clears the credentials hint when the login is retried', async () => {
        mocks.login.mockImplementationOnce((_values, options) => options.onError(new Error(FETCH_ERRORS.UNAUTHORIZED)));
        render(<LoginForm />);
        const user = await fillRequiredFields();

        await user.click(screen.getByRole('button', { name: 'Sign in' }));
        expect(await screen.findByTestId('login-credentials-hint')).toBeInTheDocument();

        // Second submit: mutation stays pending — the stale hint must disappear.
        mocks.login.mockImplementationOnce(() => {});
        await user.click(screen.getByRole('button', { name: 'Sign in' }));

        await waitFor(() => {
            expect(screen.queryByTestId('login-credentials-hint')).not.toBeInTheDocument();
        });
    });

    it('shows an admin-only error message when the account has no admin portal access', async () => {
        mocks.login.mockImplementation((_values, options) => options.onError(new Error(ADMIN_PORTAL_ACCESS_DENIED)));
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
        mocks.login.mockImplementationOnce((_values, options) =>
            options.onError({
                message: FETCH_ERRORS.BAD_REQUEST,
                options: { data: { otpType: TwoFactorType.Email } },
            }),
        );
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

    it('shows the generic OTP guidance when the authentication response omits the OTP type', async () => {
        mocks.login.mockImplementationOnce((_values, options) =>
            options.onError({
                message: FETCH_ERRORS.BAD_REQUEST,
                options: { data: {} },
            }),
        );
        render(<LoginForm />);
        const user = await fillRequiredFields();

        await user.click(screen.getByRole('button', { name: 'Sign in' }));

        expect(await screen.findByPlaceholderText('One-time password')).toBeInTheDocument();
        expect(screen.getByText('Please enter one-time password')).toBeInTheDocument();
        expect(screen.queryByText('message.form.login.otp.')).not.toBeInTheDocument();
    });
});
