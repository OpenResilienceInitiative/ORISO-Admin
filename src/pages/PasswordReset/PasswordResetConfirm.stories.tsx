import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse } from 'msw';
import { expect, userEvent, within } from 'storybook/test';
import { ThemeProvider } from '@mui/material/styles';
import { orisoMuiTheme } from '../../theme/orisoMuiTheme';
import { PasswordResetConfirmForm } from './PasswordResetConfirm';

const meta = {
    title: 'Pages/Authentication/AdminPasswordReset/Confirm',
    component: PasswordResetConfirmForm,
    parameters: {
        layout: 'centered',
        msw: {
            handlers: [
                http.post('*/service/users/password-reset/confirm', () => new HttpResponse(null, { status: 204 })),
            ],
        },
    },
    decorators: [
        (Story) => (
            <ThemeProvider theme={orisoMuiTheme}>
                <div style={{ width: 360 }}>
                    <Story />
                </div>
            </ThemeProvider>
        ),
    ],
    args: { tokenOverride: 'storybook-one-time-token' },
} satisfies Meta<typeof PasswordResetConfirmForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const InvalidLink: Story = {
    args: { tokenOverride: '' },
};

export const RejectedLink: Story = {
    parameters: {
        msw: {
            handlers: [
                http.post('*/service/users/password-reset/confirm', () => new HttpResponse(null, { status: 400 })),
            ],
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.type(canvas.getByLabelText(/^(Neues Passwort|New password)$/i), 'StorybookPassword1!');
        await userEvent.type(
            canvas.getByLabelText(/^(Neues Passwort wiederholen|Repeat new password)$/i),
            'StorybookPassword1!',
        );
        await userEvent.click(canvas.getByRole('button', { name: /^(Passwort festlegen|Set password)$/i }));
        await expect(await canvas.findByRole('alert')).toBeVisible();
        const recovery = canvas.getByRole('link', { name: /^(Neuen Link anfordern|Request a new reset link)$/i });
        await expect(recovery).toBeVisible();
        await expect(recovery).toHaveAttribute('href', '/admin/password-reset');
    },
};
