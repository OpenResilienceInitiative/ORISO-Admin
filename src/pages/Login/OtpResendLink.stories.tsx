import type { Meta, StoryObj } from '@storybook/react-vite';
import { ThemeProvider } from '@mui/material/styles';
import { orisoMuiTheme } from '../../theme/orisoMuiTheme';
import OtpResendLink from './OtpResendLink';

/**
 * "Send a new code" under the one-time-code field of the admin login
 * (ORISO-UserService#1338).
 *
 * The admin panel had no such link at all: an expired code, or a second login tab
 * — which silently invalidates the first code — meant reloading and typing the
 * password again. Three states, and why each exists:
 *
 * - **Ready** — the link is clickable, and the realm has not asked for a wait.
 * - **Waiting** — Keycloak refuses another code mail for a few seconds, so the link
 *   counts down instead of inviting a click that does nothing. The code already in
 *   the inbox stays valid while it waits.
 * - **Failed** — a request that did not get through says so, instead of looking
 *   exactly like a successful one.
 *
 * The line about only the newest code being valid is always visible, and the
 * confirmation says the request was sent rather than claiming a mail was: Keycloak
 * answers "code mailed" and "too soon, keep the one you have" with the same 400.
 */
const meta = {
    title: 'Molecules/OtpResendLink',
    component: OtpResendLink,
    parameters: { layout: 'centered' },
    decorators: [
        (Story) => (
            <ThemeProvider theme={orisoMuiTheme}>
                <div style={{ width: 'min(400px, 92vw)' }}>
                    <Story />
                </div>
            </ThemeProvider>
        ),
    ],
} satisfies Meta<typeof OtpResendLink>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Clickable; the answer arrives after a short round trip. */
export const Ready: Story = {
    args: {
        onResend: () =>
            new Promise<void>((resolve) => {
                window.setTimeout(resolve, 600);
            }),
    },
};

/** The realm reported a 30 second wait, so the link is dead and counting. */
export const WaitingForTheCooldown: Story = {
    args: {
        cooldownSeconds: 30,
        onResend: () => Promise.resolve(),
    },
};

/** The request did not get through — not the same thing as a code being on its way. */
export const RequestFailed: Story = {
    args: {
        onResend: () => Promise.reject(new Error('smtp down')),
    },
};
