import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse } from 'msw';
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
