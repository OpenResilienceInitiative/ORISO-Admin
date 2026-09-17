import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TwoFactorSetup } from './TwoFactorSetup';
import { TwoFactorType } from '../../enums/TwoFactorType';
import { UserData } from '../../types/user';

const mocks = vi.hoisted(() => ({
    updateOrSetTwoFactorAuth: vi.fn(),
    deleteTwoFactorAuth: vi.fn(),
    setEmailForActivationCode: vi.fn(),
    logout: vi.fn(),
}));

vi.mock('../../api/auth/logout', () => ({
    default: mocks.logout,
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
        document.body.innerHTML = '<div id="overlay"></div><div id="root"></div>';
    });

    it('offers no close icon during mandatory 2FA setup — the popup is hard (#990)', async () => {
        render(<TwoFactorSetup context="profile" required />);

        expect(await screen.findByText('twoFactorAuth.activate.step1.title')).toBeInTheDocument();
        expect(document.querySelector('.overlay__closeIcon')).toBeNull();
    });

    it('offers logout as the only other way off the mandatory popup (#990)', async () => {
        const user = userEvent.setup({ delay: null });
        render(<TwoFactorSetup context="profile" required />);

        await user.click(await screen.findByRole('button', { name: 'logout' }));

        expect(mocks.logout).toHaveBeenCalledWith(true);
    });

    it('keeps the close icon when 2FA is set up voluntarily from the profile', async () => {
        const user = userEvent.setup({ delay: null });
        render(<TwoFactorSetup context="profile" />);

        await user.click(screen.getByRole('switch'));

        expect(await screen.findByText('twoFactorAuth.activate.step1.title')).toBeInTheDocument();
        expect(document.querySelector('.overlay__closeIcon')).not.toBeNull();
        expect(screen.queryByRole('button', { name: 'logout' })).not.toBeInTheDocument();
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
    });
});
