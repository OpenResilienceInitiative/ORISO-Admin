import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse } from 'msw';
// eslint-disable-next-line import/no-unresolved -- SB10 subpath export, invisible to the eslint import resolver
import { expect, userEvent, waitFor, within } from 'storybook/test';
import LoginForm from './LoginForm';

/**
 * The admin sign-in form at its second-factor step (ORISO-UserService#1338).
 *
 * This is the wired view, not a mock of the layout: the real `LoginForm`, the
 * real login mutation and the real error routing run here, and only the realm
 * behind them is replaced — MSW answers the Keycloak token endpoint with the
 * exact bodies Keycloak sends.
 *
 * What #1338 changed, visible in these three stories:
 *
 * - There is a resend link at all. Without it an expired code — or a second
 *   login tab, which silently invalidates the first code — meant reloading and
 *   typing the password again.
 * - It submits username and password WITHOUT a code. The code field is
 *   `required`, so going through the form's own submit would stop at "please
 *   enter one-time password" and the replacement could never be requested.
 * - A realm that asks for a wait is counted down instead of inviting a click it
 *   will refuse, and a refusal (429) says how long to wait rather than claiming
 *   the server is unreachable, which is what it used to read as.
 */
const meta = {
    title: 'Pages/Login/TwoFactorResend',
    component: LoginForm,
    parameters: { layout: 'centered' },
    decorators: [
        (Story) => (
            <div style={{ width: 'min(400px, 92vw)' }}>
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof LoginForm>;

export default meta;
type Story = StoryObj<typeof meta>;

const TOKEN_ENDPOINT = '*/protocol/openid-connect/token';

/** The 400 challenge Keycloak answers a token request that carried no code with. */
const emailOtpChallenge = (resendAvailableInSeconds?: number) =>
    HttpResponse.json(
        {
            error: 'invalid_grant',
            error_description: 'Missing totp',
            otpType: 'EMAIL',
            ...(resendAvailableInSeconds ? { resendAvailableInSeconds } : {}),
        },
        { status: 400 },
    );

/** Fills in the form and submits it, which is what reveals the second-factor step. */
const reachTheCodeStep = async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const canvas = within(canvasElement);

    await userEvent.type(canvas.getByPlaceholderText('Benutzername/E-Mail'), 'admin@example.org');
    await userEvent.type(canvas.getByPlaceholderText('Passwort'), 'not-a-real-password');
    await userEvent.click(canvas.getByRole('button', { name: 'Anmelden' }));

    return canvas;
};

/**
 * A realm from before #1338: it asks for a code but reports no waiting time, so
 * the link is clickable and falls back to its own 30 second wait after a click.
 * This is what today's Dev realm does until the Keycloak image is released.
 */
export const CodeRequested: Story = {
    parameters: {
        msw: { handlers: [http.post(TOKEN_ENDPOINT, () => emailOtpChallenge())] },
    },
    play: async (context) => {
        const canvas = await reachTheCodeStep(context);

        await waitFor(() => expect(canvas.getByRole('button', { name: 'Neuen Code senden' })).toBeEnabled());
        await expect(canvas.getByText('Es gilt immer nur der zuletzt gesendete Code.')).toBeInTheDocument();
    },
};

/**
 * The realm has just mailed a code and refuses another one for 30 seconds. The
 * link counts that down; the code already in the inbox stays valid meanwhile.
 */
export const WaitingForTheRealm: Story = {
    parameters: {
        msw: { handlers: [http.post(TOKEN_ENDPOINT, () => emailOtpChallenge(30))] },
    },
    play: async (context) => {
        const canvas = await reachTheCodeStep(context);

        await waitFor(() => expect(canvas.getByRole('button', { name: /Neuen Code senden \(0:/ })).toBeDisabled());
    },
};

/**
 * The per-window ceiling is reached: five code mails inside fifteen minutes.
 * Keycloak answers 429, which used to arrive as "the server is unreachable" —
 * advice that makes it worse, because reloading and retrying costs another mail.
 */
export const TooManyCodesRequested: Story = {
    parameters: {
        msw: {
            handlers: [
                http.post(TOKEN_ENDPOINT, () =>
                    HttpResponse.json(
                        {
                            error: 'invalid_grant',
                            error_description: 'Too many codes requested',
                            otpType: 'EMAIL',
                            resendAvailableInSeconds: 420,
                        },
                        { status: 429 },
                    ),
                ),
            ],
        },
    },
    play: async (context) => {
        await reachTheCodeStep(context);

        await waitFor(() =>
            expect(
                within(document.body).getByText(
                    'Zu viele Versuche. Bitte warten Sie etwa 7 Minuten, bevor Sie es erneut versuchen.',
                ),
            ).toBeInTheDocument(),
        );
    },
};
