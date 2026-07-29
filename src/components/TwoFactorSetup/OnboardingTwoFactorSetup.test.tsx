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
