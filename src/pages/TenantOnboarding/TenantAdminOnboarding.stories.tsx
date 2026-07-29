import type { Meta, StoryObj } from '@storybook/react-vite';
import { ThemeProvider } from '@mui/material/styles';
import { orisoMuiTheme } from '../../theme/orisoMuiTheme';
import { createStubTenantAdminOnboardingClient } from '../../api/tenantOnboarding/tenantOnboarding';
import { TenantAdminOnboarding } from './TenantAdminOnboarding';
import { AccountStep } from './AccountStep';
import { TwoFactorStep } from './TwoFactorStep';

/**
 * Public tenant-admin onboarding flow (TEN-INV U8, #571): the invite link
 * reserved the tenant ID, this flow creates the inactive tenant + admin
 * account (consuming the reservation atomically) and ends with the 2FA setup.
 * Every story injects the typed stub client explicitly — in production the
 * page defaults to the real public UserService client (U3/U6 endpoints).
 * In the OrganisationAndDpa story, walk through: fill the
 * fields → Continue → passwords → Create account → code 123456 (000000 shows
 * the invalid-code state).
 */
const meta = {
    title: 'Pages/TenantOnboarding/Flow',
    component: TenantAdminOnboarding,
    parameters: { layout: 'centered' },
    decorators: [
        // The preview decorator already provides a MemoryRouter (Link in the done state).
        (Story) => (
            <ThemeProvider theme={orisoMuiTheme}>
                <div style={{ width: 'min(520px, 92vw)', padding: '16px 0' }}>
                    <Story />
                </div>
            </ThemeProvider>
        ),
    ],
    args: { inviteToken: 'storybook-invite-token' },
} satisfies Meta<typeof TenantAdminOnboarding>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Step 1: organisation data + the published DPA/AVV text with the signer fields. */
export const OrganisationAndDpa: Story = {
    args: { client: createStubTenantAdminOnboardingClient({ latencyMs: 0 }) },
};

/** Step 1 on a phone (390x844, #571 acceptance) — the DPA text scrolls in its own region. */
export const OrganisationAndDpaMobile: Story = {
    args: { client: createStubTenantAdminOnboardingClient({ latencyMs: 0 }) },
    parameters: {
        viewport: {
            options: {
                phone390: { name: 'Phone 390×844', styles: { width: '390px', height: '844px' } },
            },
        },
    },
    globals: { viewport: { value: 'phone390', isRotated: false } },
};

/** A consumed link: distinct terminal state, no form, nothing resubmittable. */
export const LinkConsumed: Story = {
    args: { client: createStubTenantAdminOnboardingClient({ latencyMs: 0, inviteState: 'CONSUMED' }) },
};

/** A revoked link. */
export const LinkRevoked: Story = {
    args: { client: createStubTenantAdminOnboardingClient({ latencyMs: 0, inviteState: 'REVOKED' }) },
};

/** An expired link. */
export const LinkExpired: Story = {
    args: { client: createStubTenantAdminOnboardingClient({ latencyMs: 0, inviteState: 'EXPIRED' }) },
};

/** An unknown/malformed link. */
export const LinkInvalid: Story = {
    args: { client: createStubTenantAdminOnboardingClient({ latencyMs: 0, inviteState: 'INVALID' }) },
};

/**
 * Resume (#569 hardening): the link was already used for registration but the
 * mandatory 2FA activation is still open — reopening it re-enters directly at
 * the 2FA step (code 123456 completes, 000000 shows the invalid-code state)
 * instead of the CONSUMED dead end.
 */
export const ResumedAtTwoFactor: Story = {
    args: { client: createStubTenantAdminOnboardingClient({ latencyMs: 0, inviteState: 'PENDING_2FA_ACTIVATION' }) },
};

/**
 * Transient resolve failure (#569 hardening): network/5xx while checking the
 * link renders a RETRYABLE error — deliberately distinct from the terminal
 * "link invalid" state.
 */
export const LoadError: Story = {
    args: {
        client: {
            getOnboardingInvite: () => Promise.reject(new Error('TENANT_ONBOARDING_HTTP_503')),
            registerTenantAdmin: () => Promise.reject(new Error('TENANT_ONBOARDING_HTTP_503')),
            activateTwoFactor: () => Promise.reject(new Error('TENANT_ONBOARDING_HTTP_503')),
        },
    },
};

const STUB_INVITE_PROPS = {
    recipientEmail: 'tenant.admin@example.org',
    firstName: 'Erika',
    lastName: 'Beispiel',
    reservedTenantId: 21,
    tenantIdReservationToken: 'storybook-reservation-token',
    expiresAt: null,
    dpaContent: null,
};

/** Step 2 in isolation: account creation for the invited address. */
export const AccountStepStory: StoryObj = {
    name: 'AccountStep',
    render: () => (
        <AccountStep
            invite={STUB_INVITE_PROPS}
            busy={false}
            showRegistrationError={false}
            onBack={() => {}}
            onSubmit={() => {}}
        />
    ),
};

/** Step 3 in isolation: TOTP linking + first one-time code. */
export const TwoFactorStepStory: StoryObj = {
    name: 'TwoFactorStep',
    render: () => (
        <TwoFactorStep
            result={{
                tenantId: 21,
                twoFactor: { secret: 'ORISOSTUBTOTPSECRET234567ABCDEFG', qrCodeBase64: null },
                resumed: false,
            }}
            busy={false}
            showCodeError={false}
            showServiceError={false}
            onSubmit={() => {}}
        />
    ),
};
