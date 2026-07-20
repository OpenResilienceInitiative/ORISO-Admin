import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { PasswordResetConfirmForm } from './PasswordResetConfirm';
import { confirmAdminPasswordReset } from '../../api/passwordReset/passwordReset';

vi.mock('../../api/passwordReset/passwordReset', () => ({
    confirmAdminPasswordReset: vi.fn(),
}));

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));

describe('PasswordResetConfirmForm', () => {
    beforeEach(() => {
        vi.mocked(confirmAdminPasswordReset).mockReset();
    });

    it('uses the URL token to set a valid matching password and shows success', async () => {
        vi.mocked(confirmAdminPasswordReset).mockResolvedValue(new Response(null, { status: 204 }));
        const user = userEvent.setup();
        render(
            <MemoryRouter initialEntries={['/admin/password-reset/confirm?token=one-time-token']}>
                <PasswordResetConfirmForm />
            </MemoryRouter>,
        );

        await user.type(screen.getByLabelText('passwordReset.newPassword'), 'SecurePass1!');
        await user.type(screen.getByLabelText('passwordReset.repeatPassword'), 'SecurePass1!');
        await user.click(screen.getByRole('button', { name: 'passwordReset.setPassword' }));

        await waitFor(() => {
            expect(confirmAdminPasswordReset).toHaveBeenCalledWith('one-time-token', 'SecurePass1!');
        });
        expect(await screen.findByRole('heading', { name: 'passwordReset.successTitle' })).toBeInTheDocument();
    });

    it('keeps the form visible and shows a non-destructive error when confirmation fails', async () => {
        vi.mocked(confirmAdminPasswordReset).mockRejectedValue(new Error('service unavailable'));
        const user = userEvent.setup();
        render(
            <MemoryRouter initialEntries={['/admin/password-reset/confirm?token=one-time-token']}>
                <PasswordResetConfirmForm />
            </MemoryRouter>,
        );

        await user.type(screen.getByLabelText('passwordReset.newPassword'), 'SecurePass1!');
        await user.type(screen.getByLabelText('passwordReset.repeatPassword'), 'SecurePass1!');
        await user.click(screen.getByRole('button', { name: 'passwordReset.setPassword' }));

        expect(await screen.findByRole('alert')).toHaveTextContent('passwordReset.confirmError');
        expect(screen.getByLabelText('passwordReset.newPassword')).toBeInTheDocument();
        expect(screen.getByLabelText('passwordReset.repeatPassword')).toBeInTheDocument();
        expect(screen.queryByRole('heading', { name: 'passwordReset.invalidTitle' })).not.toBeInTheDocument();
    });
});
