import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
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

    it('retains the form on rejection and lets the user request a new link by keyboard', async () => {
        vi.mocked(confirmAdminPasswordReset).mockRejectedValue(new Error('confirmation rejected'));
        const user = userEvent.setup();
        render(
            <MemoryRouter initialEntries={['/admin/password-reset/confirm?token=one-time-token']}>
                <Routes>
                    <Route path="/admin/password-reset/confirm" element={<PasswordResetConfirmForm />} />
                    <Route path="/admin/password-reset" element={<h1>Request a reset link</h1>} />
                </Routes>
            </MemoryRouter>,
        );

        expect(screen.queryByRole('link', { name: 'passwordReset.requestNewLink' })).not.toBeInTheDocument();
        await user.type(screen.getByLabelText('passwordReset.newPassword'), 'SecurePassword1!');
        await user.type(screen.getByLabelText('passwordReset.repeatPassword'), 'SecurePassword1!');
        await user.click(screen.getByRole('button', { name: 'passwordReset.setPassword' }));

        expect(await screen.findByRole('alert')).toHaveTextContent('passwordReset.confirmError');
        expect(screen.getByLabelText('passwordReset.newPassword')).toHaveValue('SecurePassword1!');
        expect(screen.getByLabelText('passwordReset.repeatPassword')).toHaveValue('SecurePassword1!');
        const recovery = screen.getByRole('link', { name: 'passwordReset.requestNewLink' });
        expect(recovery).toHaveAttribute('href', '/admin/password-reset');
        await user.tab({ shift: true });
        expect(recovery).toHaveFocus();
        await user.keyboard('{Enter}');
        expect(await screen.findByRole('heading', { name: 'Request a reset link' })).toBeInTheDocument();
        expect(confirmAdminPasswordReset).toHaveBeenCalledTimes(1);
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
