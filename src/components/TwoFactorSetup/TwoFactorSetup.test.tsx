import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TwoFactorSetup } from './TwoFactorSetup';
import { TwoFactorType } from '../../enums/TwoFactorType';
import { FETCH_ERRORS } from '../../api/fetchData';
import { UserData } from '../../types/user';

const mocks = vi.hoisted(() => ({
    updateOrSetTwoFactorAuth: vi.fn(),
    deleteTwoFactorAuth: vi.fn(),
    setEmailForActivationCode: vi.fn(),
}));

const userData = {
    email: 'chuck@example.com',
    twoFactorAuth: {
        isEnabled: true,
        isActive: false,
        isToEncourage: true,
        qrCode: '',
        secret: 'secret',
        type: TwoFactorType.App,
    },
} as UserData;

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => key,
    }),
}));

vi.mock('../../hooks/useUserData.hook', () => ({
    useUserData: () => ({ data: userData }),
}));

vi.mock('../../hooks/useUserTwoFactorAuth.hook', () => ({
    useUserTwoFactorAuth: () => ({ mutate: mocks.updateOrSetTwoFactorAuth }),
    useUserTwoFactorDelete: () => ({ mutate: mocks.deleteTwoFactorAuth }),
    useUserTwoFactorSendEmailCode: () => ({ mutate: mocks.setEmailForActivationCode }),
}));

describe('TwoFactorSetup (profile context)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        userData.email = 'chuck@example.com';
        userData.twoFactorAuth.isActive = false;
        userData.twoFactorAuth.secret = 'secret';
        userData.twoFactorAuth.qrCode = '';
        userData.twoFactorAuth.type = TwoFactorType.App;
    });

    it('shows mandatory setup inline in the onboarding design, not the legacy step overlay', () => {
        render(<TwoFactorSetup context="profile" required />);

        expect(screen.getByText('twoFactorSetup.title')).toBeInTheDocument();
        expect(screen.queryByText('twoFactorAuth.activate.step1.title')).not.toBeInTheDocument();
        expect(document.querySelector('.twoFactorAuth__overlay')).toBeNull();
        // Mandatory setup has no way to dismiss it.
        expect(screen.queryByRole('button', { name: 'twoFactorSetup.cancel' })).not.toBeInTheDocument();
    });

    it('shows the stored secret as base32, never the raw value, and activates the app with it', async () => {
        const user = userEvent.setup({ delay: null });
        render(<TwoFactorSetup context="profile" required />);

        await user.click(screen.getByRole('radio', { name: 'twoFactorAuth.activate.radio.label.app' }));
        const shown = screen.getByTestId('totp-secret');
        expect(shown).toHaveTextContent('ONSWG4TFOQ');
        expect(shown.textContent).not.toBe('secret');

        await user.type(screen.getByLabelText('twoFactorSetup.otp.label'), '123456');
        await user.click(screen.getByRole('button', { name: 'twoFactorSetup.submit' }));

        await waitFor(() =>
            expect(mocks.updateOrSetTwoFactorAuth).toHaveBeenCalledWith(
                { twoFactorType: TwoFactorType.App, otp: '123456', secret: 'secret' },
                expect.any(Object),
            ),
        );
    });

    it('shows the invalid-code message when the user service rejects the code', async () => {
        mocks.updateOrSetTwoFactorAuth.mockImplementation((_data, { onError }) =>
            onError(new Error(FETCH_ERRORS.BAD_REQUEST)),
        );
        const user = userEvent.setup({ delay: null });
        render(<TwoFactorSetup context="profile" required />);

        await user.click(screen.getByRole('radio', { name: 'twoFactorAuth.activate.radio.label.app' }));
        await user.type(screen.getByLabelText('twoFactorSetup.otp.label'), '000000');
        await user.click(screen.getByRole('button', { name: 'twoFactorSetup.submit' }));

        expect(await screen.findByRole('alert')).toHaveTextContent('twoFactorSetup.otp.invalid');
    });

    it('sends the email code to the account address and activates email with the entered code', async () => {
        mocks.setEmailForActivationCode.mockImplementation((_email, { onSuccess }) => onSuccess());
        const user = userEvent.setup({ delay: null });
        render(<TwoFactorSetup context="profile" required />);

        expect(screen.getByText('twoFactorSetup.email.descriptionAccount')).toBeInTheDocument();
        expect(screen.getByText('chuck@example.com')).toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'twoFactorSetup.email.send' }));
        await waitFor(() =>
            expect(mocks.setEmailForActivationCode).toHaveBeenCalledWith('chuck@example.com', expect.any(Object)),
        );

        await user.type(await screen.findByLabelText('twoFactorSetup.otp.label'), '654321');
        await user.click(screen.getByRole('button', { name: 'twoFactorSetup.submit' }));

        await waitFor(() =>
            expect(mocks.updateOrSetTwoFactorAuth).toHaveBeenCalledWith(
                { twoFactorType: TwoFactorType.Email, otp: '654321', secret: 'secret' },
                expect.any(Object),
            ),
        );
    });

    it('offers only email and never verifies an app when setup data is missing', () => {
        userData.twoFactorAuth.secret = '';
        render(<TwoFactorSetup context="profile" required />);

        expect(screen.getByText('twoFactorSetup.title')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'twoFactorSetup.email.send' })).toBeInTheDocument();
        expect(screen.queryByRole('radio', { name: 'twoFactorAuth.activate.radio.label.app' })).toBeNull();
        expect(screen.queryByTestId('totp-secret')).not.toBeInTheDocument();
        expect(mocks.updateOrSetTwoFactorAuth).not.toHaveBeenCalled();
    });

    it('opens optional setup from the switch and closes it again with cancel', async () => {
        const user = userEvent.setup({ delay: null });
        render(<TwoFactorSetup context="profile" />);

        expect(screen.queryByText('twoFactorSetup.title')).not.toBeInTheDocument();
        await user.click(screen.getByRole('switch'));
        expect(screen.getByText('twoFactorSetup.title')).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'twoFactorSetup.cancel' }));
        expect(screen.queryByText('twoFactorSetup.title')).not.toBeInTheDocument();

        await user.click(screen.getByRole('switch'));
        expect(screen.getByRole('switch')).toBeEnabled();
        await user.click(screen.getByRole('switch'));
        expect(screen.queryByText('twoFactorSetup.title')).not.toBeInTheDocument();
    });

    it('deactivates active optional 2FA from the switch', async () => {
        userData.twoFactorAuth.isActive = true;
        const user = userEvent.setup({ delay: null });
        render(<TwoFactorSetup context="profile" />);

        await user.click(screen.getByRole('switch'));
        expect(mocks.deleteTwoFactorAuth).toHaveBeenCalledTimes(1);
        expect(screen.queryByText('twoFactorSetup.title')).not.toBeInTheDocument();
    });
});
