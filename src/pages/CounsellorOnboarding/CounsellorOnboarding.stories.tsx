import type { Meta, StoryObj } from '@storybook/react-vite';
import { ThemeProvider } from '@mui/material/styles';
import { orisoMuiTheme } from '../../theme/orisoMuiTheme';
import { createStubCounsellorOnboardingClient } from '../../api/counsellorOnboarding/counsellorOnboarding';
import { CounsellorOnboarding } from './CounsellorOnboarding';

const PHONE_390 = {
    globals: { viewport: { value: 'mobile2', isRotated: false } },
    parameters: { chromatic: { viewports: [390] } },
};

/**
 * Public counsellor onboarding wizard (#997): a counsellor invite link opens
 * this flow instead of the generic app acceptance page. Desktop composes the
 * four form cards side by side (CardGrid, one submit); below the desktop
 * breakpoint the classic one-card-per-step flow runs. Registration creates
 * the consultant through the SAME backend path as the normal admin form and
 * ends with the mandatory 2FA setup (code 123456 verifies, 000000 shows the
 * invalid-code state). Every story injects the typed stub client — in
 * production the page defaults to the real public UserService client.
 */
const meta = {
    title: 'Pages/CounsellorOnboarding/Flow',
    component: CounsellorOnboarding,
    parameters: { layout: 'padded' },
    decorators: [
        // The preview decorator already provides a MemoryRouter (navigate in the done state).
        (Story) => (
            <ThemeProvider theme={orisoMuiTheme}>
                <div style={{ width: 'min(1100px, 96vw)', padding: '16px 0' }}>
                    <Story />
                </div>
            </ThemeProvider>
        ),
    ],
    args: { inviteToken: 'storybook-invite-token' },
} satisfies Meta<typeof CounsellorOnboarding>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Desktop worksheet: all four form cards side by side, one submit. */
export const Wizard: Story = {
    args: { client: createStubCounsellorOnboardingClient({ latencyMs: 0 }) },
};

/** Mobile (390px, #997 acceptance): one card per step with Back/Next footers. */
export const WizardMobile: Story = {
    args: { client: createStubCounsellorOnboardingClient({ latencyMs: 0 }) },
    ...PHONE_390,
};

/** Resume (#569 contract): a consumed-but-2FA-pending link re-enters at the 2FA step. */
export const ResumeAtTwoFactor: Story = {
    args: {
        client: createStubCounsellorOnboardingClient({ latencyMs: 0, inviteState: 'PENDING_2FA_ACTIVATION' }),
    },
};

/** Dead link: already used (410 CONSUMED). */
export const LinkConsumed: Story = {
    args: { client: createStubCounsellorOnboardingClient({ latencyMs: 0, inviteState: 'CONSUMED' }) },
};

/** Dead link: expired (410 EXPIRED). */
export const LinkExpired: Story = {
    args: { client: createStubCounsellorOnboardingClient({ latencyMs: 0, inviteState: 'EXPIRED' }) },
};

/** Dead link: unknown token (404). */
export const LinkInvalid: Story = {
    args: { client: createStubCounsellorOnboardingClient({ latencyMs: 0, inviteState: 'INVALID' }) },
};

/** Single-topic coverage: the routed department topic arrives preselected. */
export const SingleTopicCoverage: Story = {
    args: {
        client: createStubCounsellorOnboardingClient({
            latencyMs: 0,
            invite: { topics: [{ id: 12, name: 'Familienberatung' }] },
        }),
    },
};
