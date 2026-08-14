import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- SB10 subpath export, invisible to the eslint import resolver
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { ThemeProvider } from '@mui/material/styles';
import { orisoMuiTheme } from '../../theme/orisoMuiTheme';
import { LONG_DPA_CHAPTER_COUNT, LONG_DPA_HTML, PHONE_390 } from '../../components/DpaLegalForm/dpaStoryText';
import { createStubTenantAdminOnboardingClient } from '../../api/tenantOnboarding/tenantOnboarding';
import { createStubDpaForwardClient } from '../../api/tenantOnboarding/dpaForward';
import { TenantAdminOnboarding } from './TenantAdminOnboarding';
import { AccountStep } from './AccountStep';
import { TwoFactorStep } from './TwoFactorStep';
import { DoneStep } from './DoneStep';

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
                <div style={{ width: 'min(700px, 94vw)', padding: '16px 0' }}>
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
    ...PHONE_390,
};

const longDpaClient = () =>
    createStubTenantAdminOnboardingClient({
        latencyMs: 0,
        invite: { dpaContent: JSON.stringify({ de: LONG_DPA_HTML, en: LONG_DPA_HTML }) },
    });

/**
 * A realistic 10-chapter agreement: the canonical chapter chips carry the
 * navigation, the text scrolls inside the reader (#594.1).
 */
export const OrganisationAndDpaLongText: Story = {
    args: { client: longDpaClient() },
    play: async ({ canvasElement }) => {
        await waitFor(() =>
            expect(canvasElement.querySelectorAll('[data-anchor-chip]').length).toBe(LONG_DPA_CHAPTER_COUNT),
        );
    },
};

/**
 * #594.6 — pressing Continue with an incomplete form must never do nothing:
 * the reason shows up right next to the button that was pressed.
 */
export const OrganisationAndDpaIncompleteSubmit: Story = {
    args: { client: longDpaClient() },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        // Language-agnostic: the step has exactly one submit control.
        await waitFor(() => expect(canvasElement.querySelector('button[type="submit"]')).not.toBeNull());
        await userEvent.click(canvasElement.querySelector<HTMLButtonElement>('button[type="submit"]')!);
        await expect(await canvas.findByTestId('onboarding-submit-error')).toBeVisible();
    },
};

/** Same failure state at 390x844 — the message stays at the action. */
export const OrganisationAndDpaIncompleteSubmitMobile: Story = {
    args: { client: longDpaClient() },
    ...PHONE_390,
    play: OrganisationAndDpaIncompleteSubmit.play,
};

/**
 * Step 1 forward path (#723): "I am not authorised to sign" opens the shared
 * forward dialog — copyable single-use sign link, optional e-mail send with
 * the DPA_FORWARD mail preview, and the note that the link stays valid until
 * the contract is signed.
 */
export const OrganisationDpaForwardDialog: Story = {
    args: {
        client: createStubTenantAdminOnboardingClient({ latencyMs: 0 }),
        forwardClient: createStubDpaForwardClient({ latencyMs: 300 }),
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const body = within(canvasElement.ownerDocument.body);
        await userEvent.click(
            await canvas.findByRole('button', { name: /nicht unterschriftsberechtigt|not authorised/ }),
        );
        await waitFor(async () => expect(await body.findByTestId('dpa-forward-dialog')).toBeVisible());
    },
};

/** The forward dialog at 390×844 (#723 acceptance: 320/412px usable). */
export const OrganisationDpaForwardDialogMobile: Story = {
    args: OrganisationDpaForwardDialog.args,
    ...PHONE_390,
    play: OrganisationDpaForwardDialog.play,
};

/**
 * After confirming the forward the step flips to the calm on-hold state
 * (#723): success notice, "Weitergeleitet — wartet auf Unterschrift", no
 * signer fields, no consent box — Continue works with the organisation data
 * alone.
 */
export const OrganisationDpaForwardedOnHold: Story = {
    args: {
        client: createStubTenantAdminOnboardingClient({ latencyMs: 0 }),
        forwardClient: createStubDpaForwardClient({ latencyMs: 0 }),
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const body = within(canvasElement.ownerDocument.body);
        await userEvent.click(
            await canvas.findByRole('button', { name: /nicht unterschriftsberechtigt|not authorised/ }),
        );
        const confirm = await body.findByRole('button', {
            name: /Weiterleitung abschließen|Complete forwarding/,
        });
        await waitFor(() => expect(confirm).toBeEnabled());
        await userEvent.click(confirm);
        await waitFor(async () => expect(await canvas.findByTestId('dpa-forwarded-onhold')).toBeVisible());
        await expect(canvas.queryByRole('checkbox')).toBeNull();
    },
};

/** The on-hold state at 390×844. */
export const OrganisationDpaForwardedOnHoldMobile: Story = {
    args: OrganisationDpaForwardedOnHold.args,
    ...PHONE_390,
    play: OrganisationDpaForwardedOnHold.play,
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

/**
 * #594.7 — the terminal success state: shared status confirmation, the two
 * facts that matter spelled out separately, the assigned Träger-ID as a
 * labelled detail, and a real M3 primary button instead of a bare text link.
 */
export const Done: StoryObj = {
    render: () => <DoneStep tenantId={21} />,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByTestId('onboarding-done-success-icon')).toBeVisible();
        await expect(canvas.getByTestId('onboarding-done-tenant-id')).toHaveTextContent('21');
        await expect(canvas.getAllByTestId('onboarding-done-next-step')).toHaveLength(2);
        await expect(canvas.getByRole('button', { name: /login/i })).toBeVisible();
    },
};

/** The same success state at 390x844 — icon, detail row and action stay stacked. */
export const DoneMobile: StoryObj = {
    render: () => <DoneStep tenantId={21} />,
    ...PHONE_390,
};

/**
 * Completion after a forwarded signature (#723): an additional line says the
 * admin will be e-mailed once the signature arrives.
 */
export const DoneAfterForward: StoryObj = {
    render: () => <DoneStep tenantId={21} forwarded />,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getAllByTestId('onboarding-done-next-step')).toHaveLength(3);
    },
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
