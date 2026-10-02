import type { StoryObj } from '@storybook/react-vite';
import { delay, http, HttpResponse } from 'msw';
// eslint-disable-next-line import/no-unresolved -- SB10 subpath export, invisible to the eslint import resolver
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { PHONE_390 } from '../../components/DpaLegalForm/dpaStoryText';
import { LoginSurface } from './Login';

/**
 * The public sign-in surface (#594.12–#594.17).
 *
 * It is the reference for "one surface language": the dark stage panel takes
 * the desktop sidebar's own `--m3-on-background` token, the page carries the
 * product's single background tone (`--m3-surface-container-high` — the light
 * grey the onboarding completion screen already used), the fields are tonal
 * with it instead of white cut-outs, and the footer menu — Imprint, Privacy and
 * the language entry — sits in the bottom left of the dark panel in white.
 *
 * {@link SideBySide} puts this next to the tenant-admin onboarding page so the
 * shared language is verifiable at a glance rather than by memory.
 */
const meta = {
    title: 'Pages/Login/PublicSurface',
    parameters: { layout: 'fullscreen' },
    render: () => <LoginSurface />,
};

export default meta;

/** Desktop: 40vw dark panel, form column centred in the remaining 60vw. */
export const Desktop: StoryObj = {};

/** 390x844: the stage settles off-canvas, the footer menu returns in flow. */
export const Mobile: StoryObj = {
    parameters: { layout: 'fullscreen', ...PHONE_390.parameters },
    globals: PHONE_390.globals,
};

const COMPARED = [
    { title: 'Login', id: 'pages-login-publicsurface--desktop' },
    { title: 'Tenant-admin onboarding', id: 'pages-tenantonboarding-publicpage--desktop' },
];

/**
 * The acceptance check for #594: login and onboarding side by side, each in a
 * 1512x900 frame scaled to half size. Same panel colour, same page tone, same
 * footer menu, same column centring — if one of them drifts it is visible here
 * without switching stories.
 */
export const SideBySide: StoryObj = {
    parameters: { layout: 'fullscreen' },
    render: () => (
        <div style={{ display: 'flex', gap: 16, padding: 16, alignItems: 'flex-start' }}>
            {COMPARED.map(({ title, id }) => (
                <figure key={id} style={{ margin: 0 }}>
                    <figcaption style={{ font: '600 13px/20px Inter, sans-serif', paddingBottom: 8 }}>
                        {title}
                    </figcaption>
                    <div style={{ width: 756, height: 450, overflow: 'hidden' }}>
                        <iframe
                            title={title}
                            src={`/iframe.html?id=${id}&viewMode=story`}
                            width={1512}
                            height={900}
                            style={{ border: 0, transform: 'scale(0.5)', transformOrigin: 'top left' }}
                        />
                    </div>
                </figure>
            ))}
        </div>
    ),
};

/*
 * ORISO-UserService#1338: the e-mail code step of the real sign-in form. The
 * stubbed Keycloak token endpoint answers the password grant with the 400
 * e-mail challenge, the way Keycloak does after it mailed a code; `resend`
 * decides what the "send new code" request gets back.
 */
type ResendAnswer = 'challenge' | 'outage' | 'limit';

const tokenEndpointStub = ({ firstWait, resend }: { firstWait?: number; resend: ResendAnswer }) => {
    let calls = 0;
    return {
        reset: () => {
            calls = 0;
        },
        handlers: [
            http.post('*/protocol/openid-connect/token', async () => {
                calls += 1;
                // Long enough to see that "sent" waits for the answer.
                await delay(600);
                if (calls > 1 && resend === 'outage') {
                    return new HttpResponse(null, { status: 503 });
                }
                if (calls > 1 && resend === 'limit') {
                    return HttpResponse.json({ error: 'invalid_grant' }, { status: 429 });
                }
                return HttpResponse.json(
                    {
                        error: 'invalid_grant',
                        error_description: 'Missing totp',
                        otpType: 'EMAIL',
                        ...(calls === 1 && firstWait !== undefined ? { resendAvailableInSeconds: firstWait } : {}),
                    },
                    { status: 400 },
                );
            }),
        ],
    };
};

const RESEND_LINK = /Neuen Code senden|Send new code/;

const signInUntilEmailCode = async (canvasElement: HTMLElement) => {
    const canvas = within(canvasElement);
    await userEvent.type(
        canvasElement.querySelector('input[autocomplete="username"]') as HTMLInputElement,
        'admin@example.org',
    );
    await userEvent.type(
        canvasElement.querySelector('input[autocomplete="current-password"]') as HTMLInputElement,
        'story-only',
    );
    await userEvent.click(canvasElement.querySelector('button[type="submit"]') as HTMLButtonElement);
    await canvas.findByRole('button', { name: RESEND_LINK }, { timeout: 4000 });
    return canvas;
};

const emailCodeStory = (stub: ReturnType<typeof tokenEndpointStub>, play: StoryObj['play']): StoryObj => ({
    parameters: { layout: 'fullscreen', msw: { handlers: stub.handlers } },
    beforeEach: () => stub.reset(),
    play,
});

/**
 * Right after signing in a code was mailed. The link counts down 30 s
 * ("Neuen Code senden (0:27)") and sends nothing meanwhile; it keeps keyboard
 * focus (`aria-disabled`, not `disabled`). Below: "only the newest code".
 */
export const EmailCodeCountdown: StoryObj = emailCodeStory(
    tokenEndpointStub({ resend: 'challenge' }),
    async ({ canvasElement }) => {
        const canvas = await signInUntilEmailCode(canvasElement);
        const link = canvas.getByRole('button', { name: RESEND_LINK });
        await expect(link).toHaveAttribute('aria-disabled', 'true');
        await expect(link.textContent).toMatch(/\(0:(30|29|28)\)/);
        await userEvent.click(link);
        await expect(canvas.getByRole('status')).toBeEmptyDOMElement();
        await expect(
            canvas.getByText(/Nur der zuletzt gesendete Code gilt|Only the most recently sent code is valid/),
        ).toBeVisible();
    },
);

/**
 * Frank's case: "Send new code" twice in a row. The first click sends, "New
 * code sent" appears only once Keycloak has answered, and the second click
 * meets the countdown and sends nothing.
 */
export const EmailCodeResent: StoryObj = emailCodeStory(
    tokenEndpointStub({ firstWait: 0, resend: 'challenge' }),
    async ({ canvasElement }) => {
        const canvas = await signInUntilEmailCode(canvasElement);
        await userEvent.click(canvas.getByRole('button', { name: RESEND_LINK }));
        await userEvent.click(canvas.getByRole('button', { name: RESEND_LINK }));
        await expect(canvas.getByRole('status')).toBeEmptyDOMElement();
        await waitFor(() => expect(canvas.getByRole('status')).toHaveTextContent(/Neuer Code gesendet|New code sent/), {
            timeout: 4000,
        });
        await expect(canvas.getByRole('button', { name: RESEND_LINK })).toHaveAttribute('aria-disabled', 'true');
        // The code field is still required for signing in.
        await expect(canvas.queryByText(/Einmalkennwort eingeben|enter one-time password/)).toBeNull();
    },
);

/** Keycloak unreachable (503): an error instead of "sent", and the link is usable again. */
export const EmailCodeResendFailed: StoryObj = emailCodeStory(
    tokenEndpointStub({ firstWait: 0, resend: 'outage' }),
    async ({ canvasElement }) => {
        const canvas = await signInUntilEmailCode(canvasElement);
        await userEvent.click(canvas.getByRole('button', { name: RESEND_LINK }));
        await waitFor(
            () =>
                expect(canvas.getByRole('status')).toHaveTextContent(/konnte nicht gesendet werden|could not be sent/),
            { timeout: 4000 },
        );
        await expect(canvas.getByRole('button', { name: RESEND_LINK })).toHaveAttribute('aria-disabled', 'false');
    },
);

/** More than 5 codes in 15 minutes (429, comes with slice 1 of #1338): the limit is explained. */
export const EmailCodeResendLimit: StoryObj = emailCodeStory(
    tokenEndpointStub({ firstWait: 0, resend: 'limit' }),
    async ({ canvasElement }) => {
        const canvas = await signInUntilEmailCode(canvasElement);
        await userEvent.click(canvas.getByRole('button', { name: RESEND_LINK }));
        await waitFor(
            () =>
                expect(canvas.getByRole('status')).toHaveTextContent(
                    /Zu viele Codes angefordert|Too many codes requested/,
                ),
            { timeout: 4000 },
        );
    },
);
