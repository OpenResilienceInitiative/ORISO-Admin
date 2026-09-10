import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { AdminSnackbarProvider } from './AdminSnackbarProvider';
import { clearAdminSnackbar, showAdminSnackbar } from './adminSnackbar';

describe('AdminSnackbarProvider', () => {
    afterEach(() => clearAdminSnackbar());

    it('renders a public error notification and allows the user to close it', async () => {
        const user = userEvent.setup();
        render(<AdminSnackbarProvider><div>Admin</div></AdminSnackbarProvider>);

        act(() => showAdminSnackbar({ severity: 'error', message: 'Saving the profile failed.' }));

        expect(await screen.findByRole('alert')).toHaveTextContent('Saving the profile failed.');
        await user.click(screen.getByRole('button', { name: 'Close notification' }));
        expect(screen.queryByText('Saving the profile failed.')).not.toBeInTheDocument();
    });

    it('replaces a duplicate notification instead of stacking it', async () => {
        render(<AdminSnackbarProvider><div>Admin</div></AdminSnackbarProvider>);

        act(() => {
            showAdminSnackbar({ key: 'profile-save', severity: 'error', message: 'Saving the profile failed.' });
            showAdminSnackbar({ key: 'profile-save', severity: 'error', message: 'Saving the profile failed.' });
        });

        expect(await screen.findByRole('alert')).toHaveTextContent('Saving the profile failed.');
        expect(screen.getAllByRole('alert')).toHaveLength(1);
    });
});
