import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TwoFactorSetup } from './TwoFactorSetup';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => key,
    }),
}));

const APP_LINK = { secretBase32: 'ORISOSECRET234567ABCDEFG', qrCodeBase64: null };

describe('TwoFactorSetup (onboarding context)', () => {
    it('defaults to email, sends to the invitation address, and verifies only after sending succeeds', async () => {
        const onSendEmail = vi.fn().mockResolvedValue(undefined);
        const onVerifyEmail = vi.fn();
        const onVerify = vi.fn();
        const user = userEvent.setup();
        render(
            <TwoFactorSetup
                context="onboarding"
                appLink={APP_LINK}
                email="invite@example.org"
                onSendEmail={onSendEmail}
                onVerifyEmail={onVerifyEmail}
                onVerify={onVerify}
            />,
        );

        expect(screen.getByRole('radio', { name: 'twoFactorAuth.activate.radio.label.email' })).toBeChecked();
        expect(screen.getByText('invite@example.org')).toBeInTheDocument();
        expect(screen.queryByTestId('totp-secret')).not.toBeInTheDocument();
        expect(screen.queryByLabelText('twoFactorSetup.otp.label')).not.toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'twoFactorSetup.email.send' }));
        await waitFor(() => expect(onSendEmail).toHaveBeenCalledTimes(1));
        await user.type(await screen.findByLabelText('twoFactorSetup.otp.label'), '123456');
        await user.click(screen.getByRole('button', { name: 'twoFactorSetup.submit' }));
        await waitFor(() => expect(onVerifyEmail).toHaveBeenCalledWith('123456'));
        expect(onVerify).not.toHaveBeenCalled();
    });

    it('keeps a failed email send retryable without enabling code verification', async () => {
        const onSendEmail = vi.fn().mockRejectedValueOnce(new Error('mail unavailable')).mockResolvedValue(undefined);
        const user = userEvent.setup();
        render(
            <TwoFactorSetup
                context="onboarding"
                appLink={APP_LINK}
                email="invite@example.org"
                onSendEmail={onSendEmail}
                onVerifyEmail={() => {}}
                onVerify={() => {}}
            />,
        );

        await user.click(screen.getByRole('button', { name: 'twoFactorSetup.email.send' }));
        expect(await screen.findByRole('alert')).toHaveTextContent('twoFactorSetup.email.error');
        expect(screen.queryByLabelText('twoFactorSetup.otp.label')).not.toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'twoFactorSetup.email.send' }));
        expect(await screen.findByLabelText('twoFactorSetup.otp.label')).toBeInTheDocument();
        expect(onSendEmail).toHaveBeenCalledTimes(2);
    });

    it('allows choosing the app and clears a code entered for a different method', async () => {
        const onVerify = vi.fn();
        const user = userEvent.setup();
        render(
            <TwoFactorSetup
                context="onboarding"
                appLink={APP_LINK}
                email="invite@example.org"
                onSendEmail={async () => {}}
                onVerifyEmail={() => {}}
                onVerify={onVerify}
            />,
        );
        await user.click(screen.getByRole('button', { name: 'twoFactorSetup.email.send' }));
        await user.type(await screen.findByLabelText('twoFactorSetup.otp.label'), '123456');
        await user.click(screen.getByRole('radio', { name: 'twoFactorAuth.activate.radio.label.app' }));
        expect(screen.getByTestId('totp-secret')).toBeInTheDocument();
        expect(screen.getByLabelText('twoFactorSetup.otp.label')).toHaveValue('');
        await user.type(screen.getByLabelText('twoFactorSetup.otp.label'), '654321');
        await user.click(screen.getByRole('button', { name: 'twoFactorSetup.submit' }));
        await waitFor(() => expect(onVerify).toHaveBeenCalledWith('654321'));
    });

    it('shows the injected base32 secret with a copy affordance and no QR when none is provided', () => {
        render(<TwoFactorSetup context="onboarding" appLink={APP_LINK} onVerify={() => {}} />);

        expect(screen.getByTestId('totp-secret')).toHaveTextContent('ORISOSECRET234567ABCDEFG');
        expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });

    it('renders the QR code when the seam provides one', () => {
        render(
            <TwoFactorSetup
                context="onboarding"
                appLink={{ ...APP_LINK, qrCodeBase64: 'aGVsbG8=' }}
                onVerify={() => {}}
            />,
        );

        expect(screen.getByRole('img', { name: 'twoFactorSetup.connect.qrAlt' })).toBeInTheDocument();
    });

    it('submits a valid six-digit code through the injected seam', async () => {
        const onVerify = vi.fn();
        const user = userEvent.setup();
        render(<TwoFactorSetup context="onboarding" appLink={APP_LINK} onVerify={onVerify} />);

        await user.type(screen.getByLabelText('twoFactorSetup.otp.label'), '123456');
        await user.click(screen.getByRole('button', { name: 'twoFactorSetup.submit' }));

        await waitFor(() => expect(onVerify).toHaveBeenCalledWith('123456'));
    });

    it('blocks submission of a malformed code (shared OTP contract)', async () => {
        const onVerify = vi.fn();
        const user = userEvent.setup();
        render(<TwoFactorSetup context="onboarding" appLink={APP_LINK} onVerify={onVerify} />);

        await user.type(screen.getByLabelText('twoFactorSetup.otp.label'), '12345');
        await user.click(screen.getByRole('button', { name: 'twoFactorSetup.submit' }));

        expect(await screen.findByText('twoFactorSetup.otp.format')).toBeInTheDocument();
        expect(onVerify).not.toHaveBeenCalled();
    });

    it('surfaces the retryable invalid-code and service errors as alerts', () => {
        const { rerender } = render(
            <TwoFactorSetup context="onboarding" appLink={APP_LINK} error="invalid-code" onVerify={() => {}} />,
        );
        expect(screen.getByRole('alert')).toHaveTextContent('twoFactorSetup.otp.invalid');

        rerender(<TwoFactorSetup context="onboarding" appLink={APP_LINK} error="service" onVerify={() => {}} />);
        expect(screen.getByRole('alert')).toHaveTextContent('twoFactorSetup.error.service');
    });

    it('disables the primary action while the activation is in flight', () => {
        render(<TwoFactorSetup context="onboarding" appLink={APP_LINK} busy onVerify={() => {}} />);

        expect(screen.getByRole('button', { name: 'twoFactorSetup.submit' })).toBeDisabled();
    });
});

describe('advertised onboarding method defaults and app availability', () => {
    const emailProps = {
        email: 'invite@example.org',
        onSendEmail: async () => {},
        onVerifyEmail: () => {},
        onVerify: () => {},
    };

    it('honours a supported APP default instead of replacing it with email', () => {
        render(<TwoFactorSetup context="onboarding" appLink={APP_LINK} defaultMethod="APP" {...emailProps} />);
        expect(screen.getByRole('radio', { name: 'twoFactorAuth.activate.radio.label.app' })).toBeChecked();
        expect(screen.getByTestId('totp-secret')).toBeInTheDocument();
        expect(screen.getByLabelText('twoFactorSetup.otp.label')).toBeInTheDocument();
    });

    it.each([undefined, 'EMAIL'] as const)('keeps email as the standard choice for default %s', (defaultMethod) => {
        render(
            <TwoFactorSetup context="onboarding" appLink={APP_LINK} defaultMethod={defaultMethod} {...emailProps} />,
        );
        expect(screen.getByRole('radio', { name: 'twoFactorAuth.activate.radio.label.email' })).toBeChecked();
        expect(screen.queryByTestId('totp-secret')).not.toBeInTheDocument();
    });

    it.each([null, { secretBase32: '', qrCodeBase64: null }])(
        'offers only email for a fresh setup without app material',
        (appLink) => {
            render(<TwoFactorSetup context="onboarding" appLink={appLink} defaultMethod="APP" {...emailProps} />);
            expect(
                screen.queryByRole('radio', { name: 'twoFactorAuth.activate.radio.label.app' }),
            ).not.toBeInTheDocument();
            expect(screen.getByRole('radio', { name: 'twoFactorAuth.activate.radio.label.email' })).toBeChecked();
            expect(screen.queryByLabelText('twoFactorSetup.otp.label')).not.toBeInTheDocument();
        },
    );

    it('preserves resumed app verification when no setup material is reissued', async () => {
        const onVerify = vi.fn();
        const user = userEvent.setup();
        render(
            <TwoFactorSetup
                context="onboarding"
                appLink={null}
                resumed
                defaultMethod="APP"
                {...emailProps}
                onVerify={onVerify}
            />,
        );
        expect(screen.getByRole('radio', { name: 'twoFactorAuth.activate.radio.label.app' })).toBeChecked();
        expect(screen.getByTestId('two-factor-resumed-hint')).toBeInTheDocument();
        await user.type(screen.getByLabelText('twoFactorSetup.otp.label'), '123456');
        await user.click(screen.getByRole('button', { name: 'twoFactorSetup.submit' }));
        await waitFor(() => expect(onVerify).toHaveBeenCalledWith('123456'));
    });

    it('does not permit fresh app verification when no method can be set up', () => {
        render(<TwoFactorSetup context="onboarding" appLink={null} onVerify={() => {}} />);
        expect(screen.queryByLabelText('twoFactorSetup.otp.label')).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'twoFactorSetup.submit' })).not.toBeInTheDocument();
        expect(screen.getByRole('alert')).toHaveTextContent('twoFactorSetup.error.service');
    });
});

it('falls back to the legacy app flow when email is not available', () => {
    render(<TwoFactorSetup context="onboarding" appLink={APP_LINK} defaultMethod="EMAIL" onVerify={() => {}} />);
    expect(screen.getByTestId('totp-secret')).toBeInTheDocument();
    expect(screen.getByLabelText('twoFactorSetup.otp.label')).toBeInTheDocument();
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
});
