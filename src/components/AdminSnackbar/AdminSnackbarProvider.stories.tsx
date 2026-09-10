import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect } from 'react';
import { AdminSnackbarProvider } from './AdminSnackbarProvider';
import { showAdminSnackbar, type AdminSnackbarNotification } from './adminSnackbar';

const SnackbarStory = ({ notification }: { notification: AdminSnackbarNotification }) => {
    useEffect(() => showAdminSnackbar(notification), [notification]);
    return <AdminSnackbarProvider><div style={{ minHeight: 180 }}>Admin content</div></AdminSnackbarProvider>;
};

const meta = {
    title: 'Foundations/Feedback/AdminSnackbar',
    component: SnackbarStory,
    parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof SnackbarStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Success: Story = { args: { notification: { severity: 'success', message: 'Profile saved.' } } };
export const Error: Story = { args: { notification: { severity: 'error', message: 'Saving the profile failed.' } } };
export const Warning: Story = { args: { notification: { severity: 'warning', message: 'Please review the required information.' } } };
export const FormError: Story = { args: { notification: { severity: 'error', message: 'Please correct the highlighted fields.' } } };
export const SecurityInformation: Story = {
    args: {
        notification: {
            key: 'two-factor-security-information',
            severity: 'error',
            message: 'Administrations-Konto absichern: Richten Sie jetzt die Zwei-Faktor-Authentifizierung ein.',
            persistent: true,
        },
    },
};
