import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TwoFactorStep } from './TwoFactorStep';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => key,
    }),
}));

const RAW_SECRET = 'ORISOSECRET234567ABCDEFGHIJKLMNO';
const BASE32_SECRET = 'J5JESU2PKNCUGUSFKQZDGNBVGY3UCQSDIRCUMR2IJFFEWTCNJZHQ';

const baseProps = {
    result: { tenantId: 7, twoFactor: { secret: RAW_SECRET, qrCodeBase64: null }, resumed: false },
    busy: false,
    showCodeError: false,
    showServiceError: false,
    onSubmit: () => {},
};

describe('TwoFactorStep', () => {
    it('shows the base32 form of the secret, not the raw value the service stores', () => {
        // Keycloak uses the raw characters as the HMAC key; an authenticator
        // needs their base32 form. Handing out the raw value produces codes
        // that never match, which is indistinguishable from "2FA is broken".
        render(
            <TwoFactorStep
                result={{ tenantId: 7, twoFactor: { secret: RAW_SECRET, qrCodeBase64: null }, resumed: false }}
                busy={false}
                showCodeError={false}
                showServiceError={false}
                onSubmit={() => {}}
            />,
        );

        const shown = screen.getByTestId('totp-secret').textContent ?? '';
        expect(shown).toBe(BASE32_SECRET);
    });

    it('renders the verify-only variant when a resumed link reissued no secret', () => {
        render(
            <TwoFactorStep
                result={{ tenantId: 7, twoFactor: null, resumed: true }}
                busy={false}
                showCodeError={false}
                showServiceError={false}
                onSubmit={() => {}}
            />,
        );

        expect(screen.queryByTestId('totp-secret')).not.toBeInTheDocument();
    });

    it('passes the QR code through untouched alongside the encoded secret', () => {
        render(
            <TwoFactorStep
                {...baseProps}
                result={{
                    tenantId: 7,
                    twoFactor: { secret: RAW_SECRET, qrCodeBase64: 'aGVsbG8=' },
                    resumed: false,
                }}
            />,
        );

        expect(screen.getByTestId('totp-secret')).toHaveTextContent(BASE32_SECRET);
        expect(screen.getByRole('img', { name: 'twoFactorSetup.connect.qrAlt' })).toHaveAttribute(
            'src',
            'data:image/png;base64,aGVsbG8=',
        );
    });

    it('shows the onboarding-specific title and description copy', () => {
        render(<TwoFactorStep {...baseProps} />);

        expect(screen.getByText('tenantOnboarding.twoFactor.title')).toBeInTheDocument();
        expect(screen.getByText('tenantOnboarding.twoFactor.description')).toBeInTheDocument();
    });

    it('shows the resumed hint when reentering via a consumed-but-pending link', () => {
        render(<TwoFactorStep {...baseProps} result={{ tenantId: 7, twoFactor: null, resumed: true }} />);

        expect(screen.getByTestId('two-factor-resumed-hint')).toBeInTheDocument();
    });

    it('maps a rejected one-time code to the invalid-code alert', () => {
        render(<TwoFactorStep {...baseProps} showCodeError />);

        expect(screen.getByRole('alert')).toHaveTextContent('twoFactorSetup.otp.invalid');
    });

    it('maps a technical activation failure to the service-error alert', () => {
        render(<TwoFactorStep {...baseProps} showServiceError />);

        expect(screen.getByRole('alert')).toHaveTextContent('twoFactorSetup.error.service');
    });

    it('prioritizes the code error over the service error when both are set', () => {
        render(<TwoFactorStep {...baseProps} showCodeError showServiceError />);

        expect(screen.getByRole('alert')).toHaveTextContent('twoFactorSetup.otp.invalid');
    });

    it('disables the submit action while an activation is in flight', () => {
        render(<TwoFactorStep {...baseProps} busy />);

        expect(screen.getByRole('button', { name: 'twoFactorSetup.submit' })).toBeDisabled();
    });

    it('calls onSubmit with the entered one-time code', async () => {
        const onSubmit = vi.fn();
        const user = userEvent.setup();
        render(<TwoFactorStep {...baseProps} onSubmit={onSubmit} />);

        await user.type(screen.getByLabelText('twoFactorSetup.otp.label'), '654321');
        await user.click(screen.getByRole('button', { name: 'twoFactorSetup.submit' }));

        expect(onSubmit).toHaveBeenCalledWith('654321');
    });
});
