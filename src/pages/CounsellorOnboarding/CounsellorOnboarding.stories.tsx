import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- SB10 subpath export, invisible to the eslint import resolver
import { expect, userEvent, waitFor } from 'storybook/test';
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

/** The wired stage: one flat form with realistic invite data, one submit. */
export const Wizard: Story = {
    name: 'Flat form',
    args: { client: createStubCounsellorOnboardingClient({ latencyMs: 0 }) },
    play: async ({ canvas }) => {
        // No cards, no step flow: every group is on screen at once and the
        // single submit stays disabled until the required fields are filled.
        await expect(await canvas.findByRole('heading', { name: 'Zugangsdaten' })).toBeVisible();
        await expect(canvas.getByRole('heading', { name: 'Angaben zu Ihrer Person' })).toBeVisible();
        await expect(canvas.getByRole('heading', { name: 'Anzeigenamen' })).toBeVisible();
        await expect(canvas.getByRole('heading', { name: 'Themenfelder' })).toBeVisible();
        await expect(canvas.queryByRole('button', { name: 'Weiter' })).not.toBeInTheDocument();
        await expect(canvas.getByRole('button', { name: 'Konto erstellen' })).toBeDisabled();
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

/** Single-topic coverage: the routed department topic arrives preselected. */
export const SingleTopicCoverage: Story = {
    args: {
        client: createStubCounsellorOnboardingClient({
            latencyMs: 0,
            invite: { topics: [{ id: 12, name: 'Familienberatung' }] },
        }),
    },
};

// Issue #1049 — the picture step. A 16x16 PNG with valid chunk CRCs, so the preview really decodes.
const png = Uint8Array.from(
    atob(
        'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAAFklEQVR4nGNIaFhAEmIY1TCqYfhqAADldYAQcPKLcQAAAABJRU5ErkJggg==',
    ),
    (character) => character.charCodeAt(0),
);
const photo = () => new File([png], 'portrait.png', { type: 'image/png' });

/** Picture step (#1049): choosing a photo reveals the publish switch, which starts off. */
export const PictureStepInternalByDefault: Story = {
    name: 'Picture step — internal by default',
    args: { client: createStubCounsellorOnboardingClient({ latencyMs: 0 }) },
    play: async ({ canvas }) => {
        await expect(await canvas.findByRole('heading', { name: 'Ihr Foto' })).toBeVisible();
        await expect(canvas.queryByRole('switch', { name: 'Für Ratsuchende sichtbar' })).not.toBeInTheDocument();

        await userEvent.upload(canvas.getByLabelText('Foto auswählen'), photo());

        const preview = (await canvas.findByRole('img', {
            name: 'Foto der beratenden Person',
        })) as HTMLImageElement;
        await waitFor(() => expect(preview.naturalWidth).toBe(16));

        const toggle = await canvas.findByRole('switch', { name: 'Für Ratsuchende sichtbar' });
        await expect(toggle).not.toBeChecked();
        await expect(
            canvas.getByText(
                'Das Foto sehen derzeit nur berechtigte Kolleg:innen und Admins. Ratsuchende sehen weiterhin das Avatarbild.',
            ),
        ).toBeVisible();
    },
};

/** The counsellor publishes their photo; the hint changes with the decision. */
export const PictureStepPublished: Story = {
    name: 'Picture step — published',
    args: { client: createStubCounsellorOnboardingClient({ latencyMs: 0 }) },
    play: async ({ canvas }) => {
        await userEvent.upload(await canvas.findByLabelText('Foto auswählen'), photo());
        const toggle = await canvas.findByRole('switch', { name: 'Für Ratsuchende sichtbar' });
        await userEvent.click(toggle);
        await waitFor(() => expect(toggle).toBeChecked());
        await expect(canvas.getByText(/Ratsuchende sehen dieses Foto\./)).toBeVisible();
    },
};

/** A refused photo must never cost the invitee the account they just created. */
export const PictureStepRefusedKeepsTheAccount: Story = {
    name: 'Picture step — refused photo, account kept',
    args: { client: createStubCounsellorOnboardingClient({ latencyMs: 0, pictureUploadFails: true }) },
    play: async ({ canvas }) => {
        await userEvent.type(await canvas.findByLabelText('Benutzername'), 'lena_b');
        await userEvent.type(canvas.getByLabelText('Passwort'), 'SecurePass1!');
        await userEvent.click(canvas.getByRole('checkbox', { name: 'Familienberatung' }));
        await userEvent.upload(canvas.getByLabelText('Foto auswählen'), photo());
        await userEvent.click(canvas.getByRole('button', { name: 'Konto erstellen' }));

        // The 2FA step still follows, with the photo failure stated next to it.
        await expect(await canvas.findByTestId('wizard-picture-notice')).toBeVisible();
        await expect(canvas.queryByTestId('wizard-registration-error')).not.toBeInTheDocument();
    },
};

/** Picture step at 390px — the preview, buttons and switch stay in one column. */
export const PictureStepMobile: Story = {
    name: 'Picture step (390px)',
    args: { client: createStubCounsellorOnboardingClient({ latencyMs: 0 }) },
    ...PHONE_390,
    play: async ({ canvas }) => {
        await userEvent.upload(await canvas.findByLabelText('Foto auswählen'), photo());
        await expect(await canvas.findByRole('switch', { name: 'Für Ratsuchende sichtbar' })).toBeVisible();
    },
};
