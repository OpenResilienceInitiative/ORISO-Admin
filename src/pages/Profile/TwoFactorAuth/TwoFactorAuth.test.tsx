import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TwoFactorAuth from './TwoFactorAuth';
import { TwoFactorType } from '../../../enums/TwoFactorType';
import { UserData } from '../../../types/user';

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

vi.mock('../../../hooks/useUserData.hook', () => ({
    useUserData: () => ({ data: userData }),
}));

vi.mock('../../../hooks/useUserTwoFactorAuth.hook', () => ({
    useUserTwoFactorAuth: () => ({ mutate: mocks.updateOrSetTwoFactorAuth }),
    useUserTwoFactorDelete: () => ({ mutate: mocks.deleteTwoFactorAuth }),
    useUserTwoFactorSendEmailCode: () => ({ mutate: mocks.setEmailForActivationCode }),
}));

describe('TwoFactorAuth', () => {
    beforeEach(() => {
        document.body.innerHTML = '<div id="overlay"></div><div id="root"></div>';
    });

    it('closes the setup overlay from the close icon during mandatory 2FA setup', async () => {
        const user = userEvent.setup({ delay: null });
        render(<TwoFactorAuth required />);

        expect(await screen.findByText('twoFactorAuth.activate.step1.title')).toBeInTheDocument();

        const closeIcon = document.querySelector('.overlay__closeIcon');
        expect(closeIcon).not.toBeNull();
        await user.click(closeIcon as Element);

        await waitFor(() => {
            expect(screen.queryByText('twoFactorAuth.activate.step1.title')).not.toBeInTheDocument();
        });
    });
});
