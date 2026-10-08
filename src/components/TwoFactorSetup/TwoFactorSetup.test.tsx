import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TwoFactorSetup } from './TwoFactorSetup';
import { TwoFactorType } from '../../enums/TwoFactorType';
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
        userData.twoFactorAuth.secret = 'secret';
        userData.twoFactorAuth.qrCode = '';
        document.body.innerHTML = '<div id="overlay"></div><div id="root"></div>';
    });

    it('closes the setup overlay from the close icon during mandatory 2FA setup', async () => {
        const user = userEvent.setup({ delay: null });
        render(<TwoFactorSetup context="profile" required />);

        expect(await screen.findByText('twoFactorAuth.activate.step1.title')).toBeInTheDocument();

        const closeIcon = document.querySelector('.overlay__closeIcon');
        expect(closeIcon).not.toBeNull();
        await user.click(closeIcon as Element);

        await waitFor(() => {
            expect(screen.queryByText('twoFactorAuth.activate.step1.title')).not.toBeInTheDocument();
        });
    });

    it('blocks code verification and shows an error when setup data is missing', async () => {
        userData.twoFactorAuth.secret = '';
        const user = userEvent.setup({ delay: null });
        render(<TwoFactorSetup context="profile" required />);
        await screen.findByText('twoFactorAuth.activate.step1.title');
        await user.click(screen.getByRole('button', { name: 'twoFactorAuth.overlayButton.next' }));
        await screen.findByText('twoFactorAuth.activate.app.step2.title');
        await user.click(screen.getByRole('button', { name: 'twoFactorAuth.overlayButton.next' }));
        await screen.findByText('twoFactorAuth.activate.app.step3.title');
        expect(screen.getByRole('alert')).toHaveTextContent('error.loading');
        expect(screen.queryByTestId('totp-secret')).not.toBeInTheDocument();
        const next = screen.getByRole('button', { name: 'twoFactorAuth.overlayButton.next' });
        expect(next).toBeDisabled();
        await user.click(next);
        expect(screen.queryByText('twoFactorAuth.activate.app.step4.title')).not.toBeInTheDocument();
        expect(mocks.updateOrSetTwoFactorAuth).not.toHaveBeenCalled();
    });

    it('shows the app-connect step with the raw stored secret converted to base32, never the raw value', async () => {
        // userData.twoFactorAuth.secret is 'secret' — Keycloak's raw HMAC key.
        // An authenticator needs the base32 form; regression guard for the
        // switch from the inline hi-base32 call to the shared toBase32Secret.
        const user = userEvent.setup({ delay: null });
        render(<TwoFactorSetup context="profile" required />);

        expect(await screen.findByText('twoFactorAuth.activate.step1.title')).toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'twoFactorAuth.overlayButton.next' }));

        expect(await screen.findByText('twoFactorAuth.activate.app.step2.title')).toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'twoFactorAuth.overlayButton.next' }));

        expect(await screen.findByText('twoFactorAuth.activate.app.step3.title')).toBeInTheDocument();
        const shown = screen.getByTestId('totp-secret');
        expect(shown).toHaveTextContent('ONSWG4TFOQ');
        expect(shown.textContent).not.toBe('secret');
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'twoFactorAuth.overlayButton.next' }));
        expect(await screen.findByText('twoFactorAuth.activate.app.step4.title')).toBeInTheDocument();
    });
});
