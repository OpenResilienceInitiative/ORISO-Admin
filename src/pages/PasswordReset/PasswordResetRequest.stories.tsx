import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse } from 'msw';
import { ThemeProvider } from '@mui/material/styles';
import { orisoMuiTheme } from '../../theme/orisoMuiTheme';
import { PasswordResetRequestForm } from './PasswordResetRequest';

const meta = {
    title: 'Pages/Authentication/AdminPasswordReset/Request',
    component: PasswordResetRequestForm,
    parameters: {
        layout: 'centered',
        msw: {
            handlers: [
                http.post('*/service/users/password-reset/request', () => new HttpResponse(null, { status: 204 })),
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
} satisfies Meta<typeof PasswordResetRequestForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
