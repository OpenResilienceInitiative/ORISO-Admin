import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PasswordResetRequestForm } from './PasswordResetRequest';
import { requestAdminPasswordReset } from '../../api/passwordReset/passwordReset';

vi.mock('../../api/passwordReset/passwordReset', () => ({
    requestAdminPasswordReset: vi.fn(),
}));

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key, i18n: { resolvedLanguage: 'en', language: 'en' } }),
}));

describe('PasswordResetRequestForm', () => {
    beforeEach(() => {
        vi.mocked(requestAdminPasswordReset).mockReset();
    });

    it('submits the admin identity and shows the enumeration-safe success state', async () => {
        vi.mocked(requestAdminPasswordReset).mockResolvedValue(new Response(null, { status: 204 }));
        const user = userEvent.setup();
        render(<PasswordResetRequestForm />);

        await user.type(screen.getByLabelText('passwordReset.identityLabel'), 'admin@example.com');
        await user.click(screen.getByRole('button', { name: 'passwordReset.submit' }));

        await waitFor(() => {
            expect(requestAdminPasswordReset).toHaveBeenCalledWith('admin@example.com', 'en');
        });
        expect(await screen.findByRole('heading', { name: 'passwordReset.sentTitle' })).toBeInTheDocument();
        expect(screen.queryByLabelText('passwordReset.identityLabel')).not.toBeInTheDocument();
    });
});
