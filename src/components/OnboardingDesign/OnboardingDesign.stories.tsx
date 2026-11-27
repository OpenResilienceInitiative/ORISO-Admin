import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- SB10 subpath export, invisible to the eslint import resolver
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { InviteSuggestionDialog, type InviteSuggestion } from './InviteSuggestionDialog';
import { OnboardingFlow } from './OnboardingFlow';
import { OnboardingLeadArt, type OnboardingLeadVariant } from './OnboardingLeadArt';
import {
    DoneScreen,
    ExistingAccountScreen,
    ExpiredScreen,
    NewCounsellorScreen,
    NewTenantAccountScreen,
    ResetScreen,
} from './OnboardingScreens';
import { PasswordRuleChips } from './PasswordRuleChips';
import { passwordCopy, ruleLabels } from './onboardingCopy';
import { AvatarPickerDialog } from './AvatarPickerDialog';
import styles from './styles.module.scss';

/**
 * Design: invited-account pages (password setup, new Träger, new Berater*in,
 * reset, done, expired link). One header with a calm lead graphic, a flow
 * indicator for multi-step variants, the registration step's rule chips, and
 * name / icon suggested by the inviting admin. Single hue: ORISO red + grey.
 * One password rule everywhere: 16 characters.
 */
const meta = {
    title: 'Pages/Onboarding Design',
    parameters: { layout: 'fullscreen' },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const STRONG = 'Sonnenblume-2026!xyz';

/* ── whole pages ─────────────────────────────────────────────────── */

/** Board 2: Träger admin whose account exists already. */
export const ExistingAccountTenantAdmin: Story = {
    render: () => (
        <ExistingAccountScreen
            roleLabel="Träger-Admin"
            email="santas.little.helper@getme.global"
            initials="SH"
            onSubmit={fn()}
        />
    ),
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const save = canvas.getByRole('button', { name: 'Passwort speichern' });
        await expect(save).toBeDisabled();

        await userEvent.type(canvas.getByLabelText(passwordCopy.password), STRONG);
        await userEvent.type(canvas.getByLabelText(passwordCopy.repeat), STRONG);
        await waitFor(() => expect(save).toBeEnabled());
    },
};

/** Board 3: counsellor or BST admin whose account exists already. */
export const ExistingAccountCounsellor: Story = {
    render: () => (
        <ExistingAccountScreen
            roleLabel="Berater*in / BST-Admin"
            email="maria.beispiel@beratung.example"
            initials="MB"
        />
    ),
};

/** Board 4: new Träger, step 2 of 3 — the flow shows where you are and how long it takes. */
export const NewTenantAccount: Story = {
    render: () => <NewTenantAccountScreen tenantName="Beispielstadt" email="leitung@traeger-beispiel.example" />,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(
            canvas.getByRole('status', { name: 'Schritt 2 von 3: Konto. Noch etwa 3 Minuten.' }),
        ).toBeVisible();
        await expect(canvas.getByRole('button', { name: 'Zurück' })).toBeVisible();
    },
};

/** Board 5. */
export const PasswordReset: Story = { render: () => <ResetScreen /> };

/** Board 6. */
export const Done: Story = { render: () => <DoneScreen /> };

/** Board 7: grey instead of red — an expired link is not an alarm. */
export const LinkExpired: Story = { render: () => <ExpiredScreen /> };

/**
 * Boards 8 + 9: new counsellor. Name and icon come from the inviting admin.
 * "Ändern" opens the picker as a dialog; "Abbrechen" keeps the suggestion,
 * "Übernehmen" replaces it.
 */
export const NewCounsellor: Story = {
    render: () => (
        <NewCounsellorScreen
            suggestedAvatar={{ avatarKind: 'ICON', avatarId: 'owl' }}
            suggestedDisplayName="Maria B."
            username="maria.beispiel"
        />
    ),
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByRole('img', { name: 'Owl, vorgeschlagenes Icon' })).toBeVisible();
        await expect(canvas.getByLabelText('Anzeigename')).toHaveValue('Maria B.');

        await userEvent.click(canvas.getByRole('button', { name: 'Ändern' }));
        const dialog = within(await within(document.body).findByRole('dialog'));
        await waitFor(() => expect(dialog.getByText('Icon wählen')).toBeVisible());

        // Cancel keeps the suggestion.
        await userEvent.click(dialog.getByRole('radio', { name: /otter/i }));
        await userEvent.click(dialog.getByRole('button', { name: 'Abbrechen' }));
        await waitFor(() => expect(within(document.body).queryByRole('dialog')).not.toBeInTheDocument());
        await expect(canvas.getByRole('img', { name: 'Owl, vorgeschlagenes Icon' })).toBeVisible();

        // Confirm replaces it.
        await userEvent.click(canvas.getByRole('button', { name: 'Ändern' }));
        const second = within(await within(document.body).findByRole('dialog'));
        await userEvent.click(second.getByRole('radio', { name: /otter/i }));
        await userEvent.click(second.getByRole('button', { name: 'Übernehmen' }));
        await waitFor(() => expect(canvas.getByRole('img', { name: 'Otter, gewähltes Icon' })).toBeVisible());
    },
};

/* ── dialogs on their own ────────────────────────────────────────── */

/** Board 9: the popup behind "Ändern", the same picker the counsellor wizard already uses. */
export const IconPickerDialog: Story = {
    render: () => (
        <AvatarPickerDialog
            value={{ avatarKind: 'ICON', avatarId: 'owl' }}
            displayName="Maria B."
            title="Icon wählen"
            description="Ratsuchende sehen es neben Ihrem Namen."
            cancelLabel="Abbrechen"
            confirmLabel="Übernehmen"
            onCancel={fn()}
            onConfirm={fn()}
        />
    ),
};

const ComposerDemo = () => {
    const [suggestion, setSuggestion] = useState<InviteSuggestion>({
        avatar: { avatarKind: 'ICON', avatarId: 'owl' },
        displayName: 'Maria B.',
    });
    return (
        <InviteSuggestionDialog
            inviteeName="maria.beispiel@beratung.example"
            value={suggestion}
            title="Name und Icon vorschlagen"
            description="Die Person sieht beides beim Anlegen des Kontos und kann es ändern. Einladung an"
            displayNameLabel="Anzeigename"
            displayNameHint="So sehen Ratsuchende die Person. Leer lassen, wenn sie ihn selbst wählen soll."
            clearLabel="Vorschlag entfernen"
            cancelLabel="Abbrechen"
            confirmLabel="Übernehmen"
            onCancel={fn()}
            onConfirm={setSuggestion}
        />
    );
};

/**
 * Invite composer: any inviting admin may suggest icon and display name. Both
 * optional. Admin dialog design (`Modal` + `DialogButton`), not a new pattern.
 */
export const InviteComposerSuggestion: Story = {
    render: () => <ComposerDemo />,
    play: async () => {
        const dialog = within(await within(document.body).findByRole('dialog'));
        await expect(dialog.getByLabelText('Anzeigename')).toHaveValue('Maria B.');
        await waitFor(() => expect(dialog.getByRole('button', { name: 'Vorschlag entfernen' })).toBeVisible());
    },
};

/* ── building blocks ─────────────────────────────────────────────── */

const ChipsDemo = () => {
    const [password, setPassword] = useState('');
    return (
        <div className={styles.page}>
            <input
                aria-label="Passwort"
                className={styles.outlinedInput}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
            />
            <PasswordRuleChips
                password={password}
                labels={ruleLabels}
                listLabel={passwordCopy.ruleList}
                metLabel={passwordCopy.met}
                openLabel={passwordCopy.open}
            />
        </div>
    );
};

/** Five rules; met ones collapse to their icon and move to the front. 16 characters, everywhere. */
export const RuleChips: Story = {
    render: () => <ChipsDemo />,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const input = canvas.getByLabelText('Passwort');

        await expect(canvas.getAllByRole('listitem')).toHaveLength(5);
        await expect(canvas.getByLabelText('min. 16 Zeichen: offen')).toBeVisible();

        // 15 characters with everything else satisfied: only the length stays open.
        await userEvent.type(input, 'Abcdefghij1!xyz');
        await expect(canvas.getByLabelText('min. 16 Zeichen: offen')).toBeVisible();
        await expect(canvas.getByLabelText('1x Zahl: erfüllt')).toBeVisible();

        await userEvent.type(input, 'q');
        await expect(canvas.getByLabelText('min. 16 Zeichen: erfüllt')).toBeVisible();
        await expect(canvas.queryByText('min. 16 Zeichen')).not.toBeInTheDocument();
    },
};

const FLOW_STEPS_3 = [
    { label: 'Organisation', state: 'done' as const },
    { label: 'Konto', state: 'current' as const },
    { label: 'Absichern', state: 'upcoming' as const },
];

/** Flow indicator: two and three step variants. */
export const Flow: Story = {
    render: () => (
        <div className={styles.page}>
            <OnboardingFlow
                summary="Schritt 2 von 3: Konto. Noch etwa 3 Minuten."
                eta="noch ca. 3 Min"
                steps={FLOW_STEPS_3}
            />
            <OnboardingFlow
                summary="Schritt 1 von 2: Konto. Noch etwa 2 Minuten."
                eta="noch ca. 2 Min"
                steps={[
                    { label: 'Konto', state: 'current' },
                    { label: 'Absichern', state: 'upcoming' },
                ]}
            />
        </div>
    ),
};

const LEADS: Array<{ variant: OnboardingLeadVariant; initials?: string }> = [
    { variant: 'initials', initials: 'SH' },
    { variant: 'refresh' },
    { variant: 'check' },
    { variant: 'clock' },
];

/** Lead graphics: initials, refresh, check — red; clock — grey. */
export const LeadGraphics: Story = {
    render: () => (
        <div className={styles.page}>
            {LEADS.map((lead) => (
                <OnboardingLeadArt key={lead.variant} {...lead} />
            ))}
        </div>
    ),
};
