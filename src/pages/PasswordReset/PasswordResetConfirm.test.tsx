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

        await user.type(screen.getByLabelText('passwordReset.newPassword'), 'SecurePassword1!');
        await user.type(screen.getByLabelText('passwordReset.repeatPassword'), 'SecurePassword1!');
        await user.click(screen.getByRole('button', { name: 'passwordReset.setPassword' }));

        await waitFor(() => {
            expect(confirmAdminPasswordReset).toHaveBeenCalledWith('one-time-token', 'SecurePassword1!');
        });
        expect(await screen.findByRole('heading', { name: 'passwordReset.successTitle' })).toBeInTheDocument();
        expect(screen.getByText('passwordReset.successDescription.counsellorHint')).toBeInTheDocument();
    });

    it('keeps the form visible and shows a non-destructive error when confirmation fails', async () => {
        vi.mocked(confirmAdminPasswordReset).mockRejectedValue(new Error('service unavailable'));
        const user = userEvent.setup();
        render(
            <MemoryRouter initialEntries={['/admin/password-reset/confirm?token=one-time-token']}>
                <PasswordResetConfirmForm />
            </MemoryRouter>,
        );

        await user.type(screen.getByLabelText('passwordReset.newPassword'), 'SecurePassword1!');
        await user.type(screen.getByLabelText('passwordReset.repeatPassword'), 'SecurePassword1!');
        await user.click(screen.getByRole('button', { name: 'passwordReset.setPassword' }));

        expect(await screen.findByRole('alert')).toHaveTextContent('passwordReset.confirmError');
        expect(screen.getByLabelText('passwordReset.newPassword')).toBeInTheDocument();
        expect(screen.getByLabelText('passwordReset.repeatPassword')).toBeInTheDocument();
        expect(screen.queryByRole('heading', { name: 'passwordReset.invalidTitle' })).not.toBeInTheDocument();
    });

    it('rejects a 15-character password with the rule chip still open, and accepts 16', async () => {
        vi.mocked(confirmAdminPasswordReset).mockResolvedValue(new Response(null, { status: 204 }));
        const user = userEvent.setup();
        render(
            <MemoryRouter initialEntries={['/admin/password-reset/confirm?token=one-time-token']}>
                <PasswordResetConfirmForm />
            </MemoryRouter>,
        );

        await user.type(screen.getByLabelText('passwordReset.newPassword'), 'Abcdefghij1234!');
        await user.type(screen.getByLabelText('passwordReset.repeatPassword'), 'Abcdefghij1234!');
        expect(screen.getByLabelText('onboarding.password.rule.length: onboarding.password.open')).toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'passwordReset.setPassword' }));
        expect(await screen.findByText('passwordReset.passwordInvalid')).toBeInTheDocument();
        expect(confirmAdminPasswordReset).not.toHaveBeenCalled();

        await user.type(screen.getByLabelText('passwordReset.newPassword'), '5');
        await user.type(screen.getByLabelText('passwordReset.repeatPassword'), '5');
        expect(screen.getByLabelText('onboarding.password.rule.length: onboarding.password.met')).toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'passwordReset.setPassword' }));
        await waitFor(() =>
            expect(confirmAdminPasswordReset).toHaveBeenCalledWith('one-time-token', 'Abcdefghij1234!5'),
        );
    });

    it('shows one heading and no raw criteria paragraph — the chips carry the rules', () => {
        render(
            <MemoryRouter initialEntries={['/admin/password-reset/confirm?token=one-time-token']}>
                <PasswordResetConfirmForm />
            </MemoryRouter>,
        );

        expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
        expect(screen.queryByText('passwordReset.passwordCriteria')).not.toBeInTheDocument();
        expect(screen.getAllByRole('listitem')).toHaveLength(5);
    });
});
