import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- SB10 subpath export, invisible to the eslint import resolver
import { expect, within } from 'storybook/test';
import { ThemeProvider } from '@mui/material/styles';
import { orisoMuiTheme } from '../../theme/orisoMuiTheme';
import { createStubCounsellorOnboardingClient } from '../../api/counsellorOnboarding/counsellorOnboarding';
import { CounsellorOnboarding } from './CounsellorOnboarding';

const PHONE_390 = {
    globals: { viewport: { value: 'mobile2', isRotated: false } },
    parameters: { chromatic: { viewports: [390] } },
};

/**
 * Public counsellor onboarding (#997): a counsellor invite link opens this
 * form instead of the generic app acceptance page. Since the owner review it
 * is ONE plain single-column form on every viewport — no cards, no icons, no
 * step flow: plain section headings separate the field groups and there is
 * exactly one submit at the end. Registration creates the consultant through
 * the SAME backend path as the normal admin form and ends with the mandatory
 * 2FA setup (code 123456 verifies, 000000 shows the invalid-code state).
 * Every story injects the typed stub client — in production the page
 * defaults to the real public UserService client.
 */
const meta = {
    title: 'Pages/CounsellorOnboarding/Flow',
    component: CounsellorOnboarding,
    parameters: { layout: 'padded' },
    decorators: [
        // The preview decorator already provides a MemoryRouter (navigate in the done state).
        // The width mirrors the `longForm` reading column of the public page layout.
        (Story) => (
            <ThemeProvider theme={orisoMuiTheme}>
                <div style={{ width: 'min(560px, 96vw)', padding: '16px 0' }}>
                    <Story />
                </div>
            </ThemeProvider>
        ),
    ],
    args: { inviteToken: 'storybook-invite-token' },
} satisfies Meta<typeof CounsellorOnboarding>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The wired stage: one flat form with realistic invite data, one submit. The
 * agency's coverage arrives preselected as input chips (x removes), the "+"
 * chip opens the menu of the tenant's further topics.
 */
export const Wizard: Story = {
    name: 'Flat form',
    args: { client: createStubCounsellorOnboardingClient({ latencyMs: 0 }) },
    play: async ({ canvas, userEvent }) => {
        // No cards, no step flow: every group is on screen at once and the
        // single submit stays disabled until the required fields are filled.
        await expect(await canvas.findByRole('heading', { name: 'Zugangsdaten' })).toBeVisible();
        await expect(canvas.getByRole('heading', { name: 'Angaben zu Ihrer Person' })).toBeVisible();
        await expect(canvas.getByRole('heading', { name: 'Anzeigenamen' })).toBeVisible();
        await expect(canvas.getByRole('heading', { name: 'Themenfelder' })).toBeVisible();
        await expect(canvas.queryByRole('button', { name: 'Weiter' })).not.toBeInTheDocument();
        await expect(canvas.getByRole('button', { name: 'Konto erstellen' })).toBeDisabled();
        // Coverage preselected; one chip dropped, a further tenant topic added via "+".
        await userEvent.click(canvas.getByRole('button', { name: 'Schuldnerberatung entfernen' }));
        await userEvent.click(canvas.getByRole('button', { name: 'Thema hinzufügen' }));
        await userEvent.click(await within(document.body).findByRole('menuitem', { name: 'Suchtberatung' }));
        await expect(canvas.getByText('Suchtberatung')).toBeVisible();
    },
};

/** Mobile (390px): the same single column, nothing collapses into steps. */
export const WizardMobile: Story = {
    name: 'Flat form (390px)',
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

/**
 * New Beratungsstelle (composer AUTO / free ID): the agency does not exist yet,
 * so the invite carries no coverage. The invitee names the agency and picks its
 * topics from the tenant's active topics — the dev dead end of 2026-09-16
 * (empty "Themenfelder", submit never enabled) becomes finishable.
 */
export const NewAgencyChooseTopics: Story = {
    name: 'New agency — choose topics',
    args: {
        client: createStubCounsellorOnboardingClient({
            latencyMs: 0,
            invite: {
                agencyId: 13,
                departmentId: null,
                agencyExists: false,
                topics: [],
                availableTopics: [
                    { id: 21, name: 'Familienberatung' },
                    { id: 22, name: 'Schuldnerberatung' },
                    { id: 23, name: 'Suchtberatung' },
                    { id: 24, name: 'Schwangerschaftsberatung' },
                    { id: 25, name: 'Migrationsberatung' },
                ],
            },
        }),
    },
    play: async ({ canvas, userEvent }) => {
        await expect(await canvas.findByRole('heading', { name: 'Ihre Beratungsstelle' })).toBeVisible();
        const submit = canvas.getByRole('button', { name: 'Konto erstellen' });
        await userEvent.type(canvas.getByLabelText('Benutzername'), 'lena_b');
        await userEvent.type(canvas.getByLabelText('Passwort'), 'SecurePass1!');
        await userEvent.click(canvas.getByRole('button', { name: 'Thema hinzufügen' }));
        await userEvent.click(await within(document.body).findByRole('menuitem', { name: 'Suchtberatung' }));
        // Topics alone are not enough — the new agency needs its name.
        await expect(submit).toBeDisabled();
        await userEvent.type(canvas.getByLabelText('Name der Beratungsstelle'), 'Beratungsstelle Nord');
        await expect(submit).toBeEnabled();
    },
};

/** Same case on a phone. */
export const NewAgencyChooseTopicsMobile: Story = {
    name: 'New agency — choose topics (390px)',
    args: NewAgencyChooseTopics.args,
    ...PHONE_390,
};

/** Existing agency without any topic and no tenant topics: an explanation, not a dead submit. */
export const NoSelectableTopics: Story = {
    name: 'No selectable topics',
    args: {
        client: createStubCounsellorOnboardingClient({
            latencyMs: 0,
            invite: { departmentId: null, agencyExists: true, topics: [], availableTopics: [] },
        }),
    },
    play: async ({ canvas }) => {
        await expect(await canvas.findByRole('alert')).toHaveTextContent('keine Themenfelder hinterlegt');
        await expect(canvas.getByRole('button', { name: 'Konto erstellen' })).toBeDisabled();
    },
};

/** Single-topic coverage: the routed department topic arrives preselected, more can be added via "+". */
export const SingleTopicCoverage: Story = {
    args: {
        client: createStubCounsellorOnboardingClient({
            latencyMs: 0,
            invite: { topics: [{ id: 12, name: 'Familienberatung' }] },
        }),
    },
};
