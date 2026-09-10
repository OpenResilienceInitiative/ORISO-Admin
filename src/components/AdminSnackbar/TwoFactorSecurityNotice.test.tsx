import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import '../../i18n';
import { AdminSnackbarProvider } from './AdminSnackbarProvider';
import { TwoFactorSecurityNotice } from './TwoFactorSecurityNotice';

const NoticeHarness = () => {
    const navigate = useNavigate();
    return (
        <>
            <button type="button" onClick={() => navigate('/next')}>Next page</button>
            <TwoFactorSecurityNotice active={false} available />
        </>
    );
};

describe('TwoFactorSecurityNotice', () => {
    it('is informational: closing it changes no gate and it returns on navigation while 2FA is inactive', async () => {
        const user = userEvent.setup();
        render(
            <MemoryRouter initialEntries={['/admin']}>
                <AdminSnackbarProvider><NoticeHarness /></AdminSnackbarProvider>
            </MemoryRouter>,
        );

        expect(await screen.findByRole('alert')).toHaveTextContent('administrator account');
        await user.click(screen.getByRole('button', { name: 'Close notification' }));
        expect(screen.queryByText('Secure your administrator account', { exact: false })).not.toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Next page' }));
        expect(await screen.findByRole('alert')).toHaveTextContent('administrator account');
    });
});
