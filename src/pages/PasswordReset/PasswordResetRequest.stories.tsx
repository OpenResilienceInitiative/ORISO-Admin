import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse } from 'msw';
import { ThemeProvider } from '@mui/material/styles';
// eslint-disable-next-line import/no-unresolved -- Storybook 10 subpath export, invisible to the eslint import resolver
import { expect, userEvent, within } from 'storybook/test';
import { findPopup, popupsOf } from '../../test/storyPopups';
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

/** P2: the request fails - one error pop-up titled "Passwort zurücksetzen"; the form stays as it is. */
export const RequestFails: Story = {
    parameters: {
        msw: {
            handlers: [
                http.post('*/service/users/password-reset/request', () => new HttpResponse(null, { status: 500 })),
            ],
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.type(await canvas.findByLabelText('Benutzername oder E-Mail'), 'admin@example.org');
        await userEvent.click(canvas.getByRole('button', { name: 'Link zum Zurücksetzen senden' }));
        const popup = await findPopup(canvasElement, 'Die Anfrage konnte nicht gesendet werden.', 'error');
        await expect(popup).toHaveTextContent('Passwort zurücksetzen');
        await expect(canvas.getByLabelText('Benutzername oder E-Mail')).toHaveValue('admin@example.org');
        await expect(popupsOf(canvasElement)).toHaveLength(1);
    },
};
