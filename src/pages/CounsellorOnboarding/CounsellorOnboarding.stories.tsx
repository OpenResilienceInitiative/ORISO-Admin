import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- SB10 subpath export, invisible to the eslint import resolver
import { expect, waitFor, within } from 'storybook/test';
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
                {/*
                  The real page paints ONE tone across the whole public surface —
                  `--m3-surface-container-high`, set by PublicPageLayoutWrapper
                  (styles/components/publicLayout.less, #594.12). The story has to
                  carry it too: the floating labels fill their notch with that same
                  token, so on Storybook's default grey they showed as a lighter
                  rectangle behind the label that does NOT exist in the app.
                */}
                <div
                    style={{
                        background: 'var(--m3-surface-container-high, #eae7e8)',
                        padding: '16px',
                    }}
                >
                    <div style={{ width: 'min(560px, 96vw)', padding: '16px 0' }}>
                        <Story />
                    </div>
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
        await expect(canvas.getByRole('heading', { name: 'Avatar & Name' })).toBeVisible();
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

/**
 * The avatar step (#1047) inside the flat form: the picker sits above the two
 * names, the initials tile follows the public display name as it is typed, and
 * the choice travels with the registration.
 */
export const AvatarStep: Story = {
    name: 'Avatar step',
    args: { client: createStubCounsellorOnboardingClient({ latencyMs: 0 }) },
    play: async ({ canvas, userEvent }) => {
        await canvas.findByRole('heading', { name: 'Avatar & Name' });
        // Nothing preselected — the invitee chooses, nothing is chosen for them.
        await expect(canvas.queryByRole('radio', { checked: true })).not.toBeInTheDocument();
        await userEvent.type(canvas.getByLabelText('Anzeigename für Ratsuchende'), 'Lena B.');
        await userEvent.click(canvas.getByRole('radio', { name: 'Initialen LB' }));
        await expect(canvas.getByRole('radio', { name: 'Initialen LB' })).toBeChecked();
        // A motif replaces the initials choice.
        await userEvent.click(canvas.getByRole('radio', { name: 'Symbol fox' }));
        await expect(canvas.getByRole('radio', { name: 'Symbol fox' })).toBeChecked();
        await expect(canvas.getByRole('radio', { name: 'Initialen LB' })).not.toBeChecked();
    },
};

/** The avatar grid at 320px — the acceptance criterion of #1046. */
export const AvatarStepNarrow: Story = {
    name: 'Avatar step (320px)',
    args: { client: createStubCounsellorOnboardingClient({ latencyMs: 0 }) },
    globals: { viewport: { value: 'mobile1', isRotated: false } },
    parameters: { chromatic: { viewports: [320] } },
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

/** Permission CREATE: the "+" is there. */
export const TopicPermissionCreate: Story = {
    name: 'Topic permission: CREATE ("+")',
    args: {
        client: createStubCounsellorOnboardingClient({ latencyMs: 0, invite: { topicPermission: 'CREATE' } }),
    },
    play: async ({ canvas }) => {
        await expect(await canvas.findByRole('button', { name: 'Thema hinzufügen' })).toBeInTheDocument();
    },
};

/** Permission SELECT_EXISTING: the agency's topics as toggles, no "+". */
export const TopicPermissionSelectExisting: Story = {
    name: 'Topic permission: SELECT_EXISTING',
    args: {
        client: createStubCounsellorOnboardingClient({
            latencyMs: 0,
            invite: {
                topicPermission: 'SELECT_EXISTING',
                topics: [
                    { id: 12, name: 'Familienberatung' },
                    { id: 13, name: 'Schuldnerberatung' },
                    { id: 14, name: 'Suchtberatung' },
                ],
                availableTopics: [],
            },
        }),
    },
    play: async ({ canvas, userEvent }) => {
        const group = await canvas.findByTestId('wizard-agency-topics');
        await expect(canvas.queryByRole('button', { name: 'Thema hinzufügen' })).not.toBeInTheDocument();
        await expect(within(group).getByRole('checkbox', { name: 'Familienberatung' })).toBeChecked();
        await userEvent.click(within(group).getByRole('checkbox', { name: 'Suchtberatung' }));
        await expect(within(group).getByRole('checkbox', { name: 'Suchtberatung' })).toBeChecked();
    },
};

/** Permission NONE with an assigned department: shown, selected and fixed. */
export const TopicPermissionNoneFixed: Story = {
    name: 'Topic permission: NONE (fixed)',
    args: {
        client: createStubCounsellorOnboardingClient({
            latencyMs: 0,
            invite: { topicPermission: 'NONE', topics: [{ id: 12, name: 'Familienberatung' }], availableTopics: [] },
        }),
    },
    play: async ({ canvas }) => {
        const chip = await canvas.findByRole('checkbox', { name: 'Familienberatung' });
        await expect(chip).toBeChecked();
        await expect(chip).toBeDisabled();
        await expect(canvas.queryByRole('button', { name: 'Thema hinzufügen' })).not.toBeInTheDocument();
    },
};

/** Permission NONE without an assigned department: exactly one agency topic. */
export const TopicPermissionNonePickOne: Story = {
    name: 'Topic permission: NONE (pick one)',
    args: {
        client: createStubCounsellorOnboardingClient({
            latencyMs: 0,
            invite: { topicPermission: 'NONE', departmentId: null, availableTopics: [] },
        }),
    },
    play: async ({ canvas, userEvent }) => {
        const group = await canvas.findByTestId('wizard-agency-topics');
        await userEvent.click(within(group).getByRole('checkbox', { name: 'Familienberatung' }));
        await userEvent.click(within(group).getByRole('checkbox', { name: 'Schuldnerberatung' }));
        await expect(within(group).getByRole('checkbox', { name: 'Familienberatung' })).not.toBeChecked();
        await expect(within(group).getByRole('checkbox', { name: 'Schuldnerberatung' })).toBeChecked();
    },
};

/** A single agency topic without the "+": preselected and fixed. */
export const TopicPermissionSingleAgencyTopic: Story = {
    name: 'Topic permission: single agency topic',
    args: {
        client: createStubCounsellorOnboardingClient({
            latencyMs: 0,
            invite: {
                topicPermission: 'SELECT_EXISTING',
                departmentId: null,
                topics: [{ id: 13, name: 'Schuldnerberatung' }],
                availableTopics: [],
            },
        }),
    },
    play: async ({ canvas }) => {
        const chip = await canvas.findByRole('checkbox', { name: 'Schuldnerberatung' });
        await expect(chip).toBeChecked();
        await expect(chip).toBeDisabled();
    },
};

/** SELECT_EXISTING on a phone (390px). */
export const TopicPermissionSelectExistingMobile: Story = {
    ...PHONE_390,
    name: 'Topic permission: SELECT_EXISTING (390px)',
    args: TopicPermissionSelectExisting.args,
};

const AGENCY_ADMIN = { targetRole: 'AGENCY_ADMIN' as const, topicPermission: 'CREATE' as const };
const alsoCounsellorSwitch = (canvasElement: HTMLElement) =>
    within(canvasElement).findByRole('switch', { name: /Berät auch|Also counsels/ });

/** Agency admin who also counsels (the default proposal): topics are required like for a counsellor. */
export const AgencyAdminAlsoCounsellorOn: Story = {
    args: {
        client: createStubCounsellorOnboardingClient({
            latencyMs: 0,
            invite: { ...AGENCY_ADMIN, alsoCounsellor: true },
        }),
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(await alsoCounsellorSwitch(canvasElement)).toHaveAttribute('aria-checked', 'true');
        await expect(canvas.getByRole('heading', { name: /^(Themenfelder|Focus topics)$/ })).toBeInTheDocument();
    },
};

/** Agency admin, "Berät auch" off: a login only — no topics, no counsellor profile. */
export const AgencyAdminAlsoCounsellorOff: Story = {
    args: {
        client: createStubCounsellorOnboardingClient({
            latencyMs: 0,
            invite: { ...AGENCY_ADMIN, alsoCounsellor: false },
        }),
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(await alsoCounsellorSwitch(canvasElement)).toHaveAttribute('aria-checked', 'false');
        await expect(canvas.queryByRole('heading', { name: /^(Themenfelder|Focus topics)$/ })).toBeNull();
        await expect(canvas.queryByRole('button', { name: /Thema hinzufügen|Add topic/ })).toBeNull();
    },
};

/** The invitee changes the proposal: switching "Berät auch" on brings the topic step back. */
export const AgencyAdminSwitchesAlsoCounsellorOn: Story = {
    args: AgencyAdminAlsoCounsellorOff.args,
    play: async ({ canvasElement, userEvent }) => {
        const canvas = within(canvasElement);
        const toggle = await alsoCounsellorSwitch(canvasElement);
        await userEvent.click(toggle);
        await waitFor(() => expect(toggle).toHaveAttribute('aria-checked', 'true'));
        await expect(canvas.getByRole('heading', { name: /^(Themenfelder|Focus topics)$/ })).toBeInTheDocument();
    },
};

/** The same off state on a phone (390 px). */
export const AgencyAdminAlsoCounsellorOffMobile: Story = {
    args: AgencyAdminAlsoCounsellorOff.args,
    ...PHONE_390,
    play: AgencyAdminAlsoCounsellorOff.play,
};

// A founding admin gives the new agency a topic even without counselling: its queued counsellors pick from it.
const FOUNDING_INVITE = {
    ...AGENCY_ADMIN,
    agencyId: 13,
    departmentId: null,
    agencyExists: false,
    topics: [],
    availableTopics: [
        { id: 21, name: 'Familienberatung' },
        { id: 23, name: 'Suchtberatung' },
    ],
};

/** Founding admin switches "Berät auch" off: the confirmation dialog (left open for review). */
export const AgencyAdminFoundingConfirmNoCounselling: Story = {
    name: 'Agency admin founding — confirm "Berät auch" off',
    args: {
        client: createStubCounsellorOnboardingClient({
            latencyMs: 0,
            invite: { ...FOUNDING_INVITE, alsoCounsellor: true },
        }),
    },
    play: async ({ canvasElement, userEvent }) => {
        await userEvent.click(await alsoCounsellorSwitch(canvasElement));
        const dialog = await within(document.body).findByRole('dialog');
        // The dialog fades in; wait for the title to be shown.
        await waitFor(() =>
            expect(within(dialog).getByText(/Sie beraten nicht selbst\?|Not counselling yourself\?/)).toBeVisible(),
        );
        await expect(within(dialog).getByText(/mindestens ein Thema|at least one topic/)).toBeVisible();
        await expect(within(dialog).getByRole('button', { name: /Ja, nur Admin|Yes, admin only/ })).toBeVisible();
        await expect(
            within(dialog).getByRole('button', { name: /Doch selbst beraten|Counsel after all/ }),
        ).toBeVisible();
        // Until confirmed, the switch stays on.
        await expect(await alsoCounsellorSwitch(canvasElement)).toHaveAttribute('aria-checked', 'true');
    },
};

/** The same dialog on a phone (390 px): both actions on one row. */
export const AgencyAdminFoundingConfirmNoCounsellingMobile: Story = {
    ...PHONE_390,
    name: 'Agency admin founding — confirm "Berät auch" off (390px)',
    args: AgencyAdminFoundingConfirmNoCounselling.args,
    play: AgencyAdminFoundingConfirmNoCounselling.play,
};

/** Confirmed "nur Admin": no counsellor profile, but the agency's topic step stays mandatory. */
export const AgencyAdminFoundingWithoutCounselling: Story = {
    name: 'Agency admin founding — without counselling, topic still required',
    args: AgencyAdminFoundingConfirmNoCounselling.args,
    play: async ({ canvasElement, userEvent }) => {
        const canvas = within(canvasElement);
        await userEvent.type(await canvas.findByLabelText('Benutzername'), 'oskar_b');
        await userEvent.type(canvas.getByLabelText('Passwort'), 'SecurePass1!');
        await userEvent.type(canvas.getByLabelText('Name der Beratungsstelle'), 'Suchtberatung Nord');
        await userEvent.click(await alsoCounsellorSwitch(canvasElement));
        await userEvent.click(await within(document.body).findByRole('button', { name: /Ja, nur Admin/ }));
        await waitFor(async () =>
            expect(await alsoCounsellorSwitch(canvasElement)).toHaveAttribute('aria-checked', 'false'),
        );
        await expect(canvas.getByRole('heading', { name: /^(Themenfelder|Focus topics)$/ })).toBeInTheDocument();
        const submit = canvas.getByRole('button', { name: 'Konto erstellen' });
        await expect(submit).toBeDisabled();
        await userEvent.click(canvas.getByRole('button', { name: 'Thema hinzufügen' }));
        await userEvent.click(await within(document.body).findByRole('menuitem', { name: 'Suchtberatung' }));
        await expect(submit).toBeEnabled();
    },
};
