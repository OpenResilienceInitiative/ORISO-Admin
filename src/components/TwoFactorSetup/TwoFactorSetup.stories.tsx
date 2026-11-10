import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse } from 'msw';
// eslint-disable-next-line import/no-unresolved -- SB10 subpath export, invisible to the eslint import resolver
import { expect, waitFor, within } from 'storybook/test';
import { ThemeProvider } from '@mui/material/styles';
import { orisoMuiTheme } from '../../theme/orisoMuiTheme';
import { TwoFactorSetup } from './TwoFactorSetup';

/**
 * Canonical 2FA setup (release blocker #569): ONE component started from two
 * contexts — the authenticated profile (switch + the same inline setup form on
 * the real user hooks, here mocked via MSW) and the public tenant-admin onboarding
 * (inline app-TOTP linking on the injected backend seam). Flow contract shared
 * with the app layer (`twoFactorSetupFlow.ts`).
 */
const meta = {
    title: 'Organisms/TwoFactorSetup',
    component: TwoFactorSetup,
    parameters: { layout: 'centered' },
    decorators: [
        (Story) => {
            return (
                <ThemeProvider theme={orisoMuiTheme}>
                    {/* Both real consumers render on a white surface (public
                        onboarding: .publicContent, profile: Card) — mirror it
                        so contrast checks match the real pages. */}
                    <div
                        style={{
                            width: 'min(520px, 92vw)',
                            padding: '24px',
                            background: 'var(--m3-surface-container-lowest, #ffffff)',
                            borderRadius: '12px',
                        }}
                    >
                        <Story />
                    </div>
                </ThemeProvider>
            );
        },
    ],
} satisfies Meta<typeof TwoFactorSetup>;

export default meta;

// The canonical component's props are a discriminated union on `context`,
// which StoryObj args cannot narrow — stories therefore use `render`.
type Story = StoryObj;

const userData = (twoFactorAuth: Record<string, unknown>) => ({
    email: 'admin@example.org',
    firstname: 'Erika',
    lastname: 'Beispiel',
    twoFactorAuth,
});

const APP_LINK = {
    secretBase32: 'ORISOSTUBTOTPSECRET234567ABCDEFG',
    qrCodeBase64: null,
};

/** Profile context, 2FA not yet active: the activation switch opens the inline setup form (with cancel). */
export const ProfileInactive: Story = {
    render: () => <TwoFactorSetup context="profile" />,
    parameters: {
        msw: {
            handlers: [
                http.get('*/service/users/data', () =>
                    HttpResponse.json(
                        userData({
                            isEnabled: true,
                            isActive: false,
                            isToEncourage: true,
                            qrCode: '',
                            secret: 'profile-secret',
                            type: 'APP',
                        }),
                    ),
                ),
            ],
        },
    },
};

/**
 * Mandatory setup (#891/#1068): what a new Träger or Beratungsstelle admin sees
 * on first login — the inline setup form from the public onboarding, open by
 * itself, without switch and without cancel. No legacy step overlay.
 */
export const ProfileMandatory: Story = {
    render: () => <TwoFactorSetup context="profile" required />,
    play: async ({ canvasElement }) => {
        const form = await waitFor(() => {
            const element = canvasElement.querySelector<HTMLElement>('form');
            if (!element) throw new Error('2FA setup form not rendered yet');
            return element;
        });
        await expect(form).toBeVisible();
        await expect(document.querySelector('.twoFactorAuth__overlay')).toBeNull();
        await expect(canvasElement.querySelector('[role="switch"]')).toBeNull();
    },
    parameters: {
        msw: {
            handlers: [
                http.get('*/service/users/data', () =>
                    HttpResponse.json(
                        userData({
                            isEnabled: true,
                            isActive: false,
                            isToEncourage: true,
                            qrCode: '',
                            secret: 'profile-secret',
                            type: 'APP',
                        }),
                    ),
                ),
            ],
        },
    },
};

/** Failed setup lookup: enrollment must not advance with neither key nor QR. */
export const ProfileMissingSetupData: Story = {
    render: () => <TwoFactorSetup context="profile" required />,
    parameters: {
        msw: {
            handlers: [
                http.get('*/service/users/data', () =>
                    HttpResponse.json(
                        userData({
                            isEnabled: true,
                            isActive: false,
                            qrCode: '',
                            secret: '',
                            type: 'APP',
                        }),
                    ),
                ),
            ],
        },
    },
};

/** Profile context with active app 2FA: switch is on and shows the configured type. */
export const ProfileActive: Story = {
    render: () => <TwoFactorSetup context="profile" />,
    parameters: {
        msw: {
            handlers: [
                http.get('*/service/users/data', () =>
                    HttpResponse.json(
                        userData({
                            isEnabled: true,
                            isActive: true,
                            isToEncourage: false,
                            qrCode: '',
                            secret: 'profile-secret',
                            type: 'APP',
                        }),
                    ),
                ),
            ],
        },
    },
};

/** Onboarding context (TEN-INV U8 step 3): inline app linking on the injected seam — no QR from the stub. */
export const Onboarding: Story = {
    render: () => <TwoFactorSetup context="onboarding" appLink={APP_LINK} onVerify={() => {}} />,
};

/** Onboarding context: the submitted one-time code was rejected (retryable). */
export const OnboardingInvalidCode: Story = {
    render: () => <TwoFactorSetup context="onboarding" appLink={APP_LINK} error="invalid-code" onVerify={() => {}} />,
};

/** Onboarding context: technical activation failure (retryable). */
export const OnboardingServiceError: Story = {
    render: () => <TwoFactorSetup context="onboarding" appLink={APP_LINK} error="service" onVerify={() => {}} />,
};

/** Onboarding context on a phone (390x844, #571 acceptance): the step scrolls vertically, the primary action stays reachable. */
export const OnboardingMobile: Story = {
    render: () => <TwoFactorSetup context="onboarding" appLink={APP_LINK} error="invalid-code" onVerify={() => {}} />,
    parameters: {
        viewport: {
            options: {
                phone390: { name: 'Phone 390×844', styles: { width: '390px', height: '844px' } },
            },
        },
    },
    globals: { viewport: { value: 'phone390', isRotated: false } },
};

/** Public setup with server-advertised email support; email is the standard choice. */
export const OnboardingEmail: Story = {
    render: () => (
        <TwoFactorSetup
            context="onboarding"
            appLink={APP_LINK}
            email="lena.beraterin@example.org"
            onSendEmail={async () => {}}
            onVerifyEmail={() => {}}
            onVerify={() => {}}
        />
    ),
};

/** A retryable delivery failure must not offer activation before a code is sent. */
export const OnboardingEmailSendFailure: Story = {
    render: () => (
        <TwoFactorSetup
            context="onboarding"
            appLink={APP_LINK}
            email="lena.beraterin@example.org"
            onSendEmail={async () => {
                throw new Error('mail unavailable');
            }}
            onVerifyEmail={() => {}}
            onVerify={() => {}}
        />
    ),
    play: async ({ canvas, canvasElement, userEvent }) => {
        await userEvent.click(canvas.getByRole('button', { name: 'Code per E-Mail senden' }));
        // The failure is a pop-up in the screen-corner host, outside the story canvas.
        await waitFor(async () =>
            expect(await within(canvasElement.ownerDocument.body).findByTestId('snackbar')).toBeVisible(),
        );
        await expect(canvas.queryByRole('textbox', { name: 'Einmalcode' })).not.toBeInTheDocument();
    },
};

/** E-mail verification state with resend and code input, no authenticator secret shown. */
export const OnboardingEmailCode: Story = {
    ...OnboardingEmail,
    play: async ({ canvas, userEvent }) => {
        await userEvent.click(canvas.getByRole('button', { name: 'Code per E-Mail senden' }));
        await expect(await canvas.findByRole('textbox', { name: 'Einmalcode' })).toBeVisible();
        await expect(canvas.getByRole('button', { name: 'Neuen Code senden' })).toBeVisible();
    },
};

/** A supported server default selects the app while email remains available. */
export const OnboardingServerAppDefault: Story = {
    render: () => (
        <TwoFactorSetup
            context="onboarding"
            appLink={APP_LINK}
            defaultMethod="APP"
            email="lena.beraterin@example.org"
            onSendEmail={async () => {}}
            onVerifyEmail={() => {}}
            onVerify={() => {}}
        />
    ),
    play: async ({ canvas, userEvent }) => {
        await expect(canvas.getByRole('radio', { name: 'App' })).toBeChecked();
        await expect(canvas.getByTestId('totp-secret')).toBeVisible();
        await userEvent.click(canvas.getByRole('radio', { name: 'E-Mail-Adresse' }));
        await expect(canvas.getByRole('button', { name: 'Code per E-Mail senden' })).toBeVisible();
    },
};

/** Fresh accounts without app material retain a usable email setup route. */
export const OnboardingFreshEmailOnly: Story = {
    render: () => (
        <TwoFactorSetup
            context="onboarding"
            appLink={null}
            defaultMethod="APP"
            email="lena.beraterin@example.org"
            onSendEmail={async () => {}}
            onVerifyEmail={() => {}}
            onVerify={() => {}}
        />
    ),
    play: async ({ canvas, userEvent }) => {
        await expect(canvas.queryByRole('radio', { name: 'App' })).not.toBeInTheDocument();
        await expect(canvas.getByRole('radio', { name: 'E-Mail-Adresse' })).toBeChecked();
        await expect(canvas.queryByRole('textbox', { name: 'Einmalcode' })).not.toBeInTheDocument();
        await userEvent.click(canvas.getByRole('button', { name: 'Code per E-Mail senden' }));
        await expect(await canvas.findByRole('textbox', { name: 'Einmalcode' })).toBeVisible();
    },
};

/** Resumed accounts may verify an app connected during their earlier setup attempt. */
export const OnboardingResumedAppWithoutMaterial: Story = {
    render: () => (
        <TwoFactorSetup
            context="onboarding"
            appLink={null}
            resumed
            defaultMethod="APP"
            email="lena.beraterin@example.org"
            onSendEmail={async () => {}}
            onVerifyEmail={() => {}}
            onVerify={() => {}}
        />
    ),
    play: async ({ canvas }) => {
        await expect(canvas.getByRole('radio', { name: 'App' })).toBeChecked();
        await expect(canvas.getByRole('textbox', { name: 'Einmalcode' })).toBeVisible();
        await expect(canvas.getByTestId('two-factor-resumed-hint')).toBeVisible();
        await expect(canvas.queryByTestId('totp-secret')).not.toBeInTheDocument();
    },
};

/** An email-only resumed invitation never enables unsupported App verification. */
export const OnboardingResumedEmailOnly: Story = {
    ...OnboardingFreshEmailOnly,
    render: () => (
        <TwoFactorSetup
            context="onboarding"
            appLink={null}
            resumed
            methods={['EMAIL']}
            defaultMethod="APP"
            email="lena.beraterin@example.org"
            onSendEmail={async () => {}}
            onVerifyEmail={() => {}}
            onVerify={() => {}}
        />
    ),
};
