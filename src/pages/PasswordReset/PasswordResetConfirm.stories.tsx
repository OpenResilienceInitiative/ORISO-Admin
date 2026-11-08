import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse } from 'msw';
import { ThemeProvider } from '@mui/material/styles';
// eslint-disable-next-line import/no-unresolved -- Storybook 10 subpath export, invisible to the eslint import resolver
import { expect, userEvent, within } from 'storybook/test';
import { findPopup, popupsOf } from '../../test/storyPopups';
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

/** P2: the server refuses the new password - one error pop-up titled "Passwort zurücksetzen". */
export const ConfirmFails: Story = {
    parameters: {
        msw: {
            handlers: [
                http.post('*/service/users/password-reset/confirm', () => new HttpResponse(null, { status: 400 })),
            ],
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const password = 'Sehr-Sicher-1234!';
        await userEvent.type(await canvas.findByLabelText('Neues Passwort'), password);
        await userEvent.type(canvas.getByLabelText('Neues Passwort wiederholen'), password);
        await userEvent.click(canvas.getByRole('button', { name: 'Passwort festlegen' }));
        const popup = await findPopup(canvasElement, 'Das Passwort konnte nicht geändert werden.', 'error');
        await expect(popup).toHaveTextContent('Passwort zurücksetzen');
        await expect(popupsOf(canvasElement)).toHaveLength(1);
    },
};
