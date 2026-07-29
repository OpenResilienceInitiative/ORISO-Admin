import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse } from 'msw';
import { ThemeProvider } from '@mui/material/styles';
import { orisoMuiTheme } from '../../theme/orisoMuiTheme';
import { TwoFactorSetup } from './TwoFactorSetup';

/**
 * Canonical 2FA setup (release blocker #569): ONE component started from two
 * contexts — the authenticated profile (switch + overlay wizard on the real
 * user hooks, here mocked via MSW) and the public tenant-admin onboarding
 * (inline app-TOTP linking on the injected backend seam). Flow contract shared
 * with the app layer (`twoFactorSetupFlow.ts`).
 */
const meta = {
    title: 'Organisms/TwoFactorSetup',
    component: TwoFactorSetup,
    parameters: { layout: 'centered' },
    decorators: [
        (Story) => {
            // The profile overlay renders through a portal into #overlay.
            if (!document.getElementById('overlay')) {
                const overlayRoot = document.createElement('div');
                overlayRoot.id = 'overlay';
                document.body.appendChild(overlayRoot);
            }
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

/** Profile context, 2FA not yet active: the activation switch opens the stepped overlay wizard. */
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
