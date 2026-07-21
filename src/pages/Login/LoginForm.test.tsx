import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginForm from './LoginForm';
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
};

const t = (key: string) => translations[key] || key;
let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

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

    it('shows a login error message for invalid credentials', async () => {
        mocks.login.mockImplementation((_values, options) => options.onError(new Error('invalid-login')));
        render(<LoginForm />);
        const user = await fillRequiredFields();

        await user.click(screen.getByRole('button', { name: 'Sign in' }));

        await waitFor(() => {
            expect(mocks.messageError).toHaveBeenCalledWith('Login failed. Please check username/email and password.');
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
