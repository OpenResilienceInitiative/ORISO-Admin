import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- exports-map subpath the eslint node resolver can't see (resolves for tsc/Vite)
import { expect, userEvent, waitFor, within } from 'storybook/test';
import i18n from '../../../../../i18n';
import type { RecipientScopePolicy } from '../../../../../types/permissionPolicy';
import { RecipientScopeControl } from './RecipientScopeControl';

/**
 * ORISO-Admin#1215 — "Who can be picked" on the Internal group chats tile of Settings →
 * Functionality Access. Three scopes with one plain sentence each; the platform admin also chooses
 * Recommendation or Requirement (the same switch as elsewhere on the permissions pages); a Träger
 * admin sees a requirement locked. Saving is explicit so a failed save can keep the edit.
 *
 * The stories run the presentational control inside a small harness that behaves like the server
 * (a save returns the saved value, or fails). The real tile is in RecipientScopeTile.stories.tsx.
 */

type Level = 'platform' | 'tenant';

const Harness = ({
    level,
    initial,
    failSave = false,
    pendingSave = false,
    disabled = false,
}: {
    level: Level;
    initial?: RecipientScopePolicy;
    failSave?: boolean;
    /** The save never answers, so the control stays in its saving state. */
    pendingSave?: boolean;
    disabled?: boolean;
}) => {
    const [policy, setPolicy] = useState(initial);
    return (
        <div style={{ maxWidth: 361, padding: 16, background: 'var(--m3-surface-container-high, #eae7e8)' }}>
            <RecipientScopeControl
                level={level}
                policy={policy}
                disabled={disabled}
                onSave={async (next) => {
                    if (pendingSave) {
                        await new Promise<void>(() => {
                            // never settles: the control stays in its saving state
                        });
                    }
                    if (failSave) throw new Error('rejected');
                    setPolicy({ ...next, inherited: false });
                }}
            />
        </div>
    );
};

const meta = {
    title: 'Organisms/Permissions/RecipientScopeControl',
    component: Harness,
    parameters: { layout: 'padded' },
    args: { level: 'platform' },
    // German is the product's primary language; the English story switches it back.
    beforeEach: async () => {
        const previousLanguage = i18n.language;
        await i18n.changeLanguage('de');
        return () => i18n.changeLanguage(previousLanguage);
    },
} satisfies Meta<typeof Harness>;

export default meta;
type Story = StoryObj<typeof meta>;

const option = (canvas: ReturnType<typeof within>, name: RegExp) => canvas.getByRole('radio', { name });

/** What TenantService#321 serves while nothing is set anywhere. */
const SERVED_DEFAULT: RecipientScopePolicy = { value: 'AGENCY', mode: 'SUGGESTED', inherited: true };

/** Nothing set anywhere: the served default, centre only. */
export const PlatformDefault: Story = {
    args: { initial: SERVED_DEFAULT },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(option(canvas, /Auf die Beratungsstelle begrenzt/)).toBeChecked();
        await expect(canvas.getByText('Standard – noch nicht geändert')).toBeVisible();
        await expect(canvas.getByRole('button', { name: 'Speichern' })).toBeDisabled();
    },
};

/** TenantService#321 not deployed: read-only with a note, because a save would be ignored. */
export const BackendFieldMissing: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        canvas.getAllByRole('radio').forEach((radio) => expect(radio).toBeDisabled());
        await expect(canvas.getByText('Verfügbar nach dem nächsten Backend-Update.')).toBeVisible();
        await expect(canvas.queryByRole('button', { name: 'Speichern' })).toBeNull();
    },
};

export const OptionPlatformWide: Story = {
    args: { initial: { value: 'PLATFORM', mode: 'SUGGESTED', inherited: false } },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(option(canvas, /Plattformweit/)).toBeChecked();
        await expect(canvas.getByText('Berater:innen können alle Kolleg:innen der Plattform auswählen.')).toBeVisible();
    },
};

export const OptionTraegerWide: Story = {
    args: { initial: { value: 'TENANT', mode: 'SUGGESTED', inherited: false } },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(option(canvas, /Trägerweit/)).toBeChecked();
        await expect(
            canvas.getByText(
                'Berater:innen können Kolleg:innen ihres eigenen Trägers aus allen Beratungsstellen auswählen.',
            ),
        ).toBeVisible();
    },
};

export const OptionCentreOnly: Story = {
    args: { initial: { value: 'AGENCY', mode: 'SUGGESTED', inherited: false } },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(option(canvas, /Auf die Beratungsstelle begrenzt/)).toBeChecked();
        await expect(
            canvas.getByText('Berater:innen können nur Kolleg:innen ihrer eigenen Beratungsstelle auswählen.'),
        ).toBeVisible();
    },
};

/** The platform admin makes the scope binding: the Requirement/Recommendation switch. */
export const PlatformRequirement: Story = {
    args: { initial: { value: 'TENANT', mode: 'ENFORCED', inherited: false } },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByRole('button', { name: 'Vorgabe' })).toHaveAttribute('aria-pressed', 'true');
        await expect(canvas.getByRole('button', { name: 'Empfehlung' })).toHaveAttribute('aria-pressed', 'false');
        await expect(canvas.getByText('Vorgabe: Kein Träger kann sie ändern.')).toBeVisible();
    },
};

/** Pick, make it a requirement, save: the control follows the saved value. */
export const PlatformSavesChoice: Story = {
    args: { initial: SERVED_DEFAULT },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(option(canvas, /Plattformweit/));
        await userEvent.click(canvas.getByRole('button', { name: 'Vorgabe' }));
        await userEvent.click(canvas.getByRole('button', { name: 'Speichern' }));
        await waitFor(() => expect(canvas.getByRole('button', { name: 'Speichern' })).toBeDisabled());
        await expect(option(canvas, /Plattformweit/)).toBeChecked();
        await expect(canvas.getByRole('button', { name: 'Vorgabe' })).toHaveAttribute('aria-pressed', 'true');
    },
};

/** Träger admin, platform only recommends: the value is inherited, and can be changed. */
export const TraegerInheritedRecommendation: Story = {
    args: { level: 'tenant', initial: { value: 'TENANT', mode: 'SUGGESTED', inherited: true } },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByText('Von der Plattform geerbt')).toBeVisible();
        await expect(canvas.queryByRole('button', { name: 'Vorgabe' })).toBeNull();
        await expect(option(canvas, /Plattformweit/)).toBeEnabled();
    },
};

/** Träger admin with a platform requirement: visible, locked, no way to save. */
export const TraegerLocked: Story = {
    args: { level: 'tenant', initial: { value: 'TENANT', mode: 'ENFORCED', inherited: true } },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(option(canvas, /Trägerweit/)).toBeChecked();
        canvas.getAllByRole('radio').forEach((radio) => expect(radio).toBeDisabled());
        await expect(canvas.queryByRole('button', { name: 'Speichern' })).toBeNull();
        await expect(canvas.getByText(/Die Plattform legt diese Auswahl als Vorgabe fest/)).toBeVisible();
    },
};

/** Träger admin who chose their own value. */
export const TraegerOwnValue: Story = {
    args: { level: 'tenant', initial: { value: 'PLATFORM', mode: 'SUGGESTED', inherited: false } },
    play: async ({ canvasElement }) => {
        await expect(within(canvasElement).getByText('Von diesem Träger festgelegt')).toBeVisible();
    },
};

/** The server rejects the save: an error says so, and the choice stays where the admin left it. */
export const SaveFails: Story = {
    args: { failSave: true, initial: SERVED_DEFAULT },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(option(canvas, /Plattformweit/));
        await userEvent.click(canvas.getByRole('button', { name: 'Speichern' }));
        await expect(await canvas.findByRole('alert')).toHaveTextContent(/^Nicht gespeichert\./);
        await expect(option(canvas, /Plattformweit/)).toBeChecked();
        await expect(canvas.getByRole('button', { name: 'Speichern' })).toBeEnabled();
    },
};

/** A slow save: the options and the switch wait, Save shows progress, and the choice being saved stays. */
export const Saving: Story = {
    args: { pendingSave: true, initial: { value: 'AGENCY', mode: 'SUGGESTED', inherited: false } },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(option(canvas, /Trägerweit/));
        await userEvent.click(canvas.getByRole('button', { name: 'Vorgabe' }));
        await userEvent.click(canvas.getByRole('button', { name: 'Speichern' }));
        await waitFor(() => expect(canvas.getByRole('button', { name: 'Speichern' })).toBeDisabled());
        await expect(canvas.getByRole('button', { name: 'Speichern' })).toHaveAttribute('aria-busy', 'true');
        canvas.getAllByRole('radio').forEach((radio) => expect(radio).toBeDisabled());
        await expect(canvas.getByRole('button', { name: 'Vorgabe' })).toBeDisabled();
        await expect(canvas.getByRole('button', { name: 'Empfehlung' })).toBeDisabled();
        await expect(option(canvas, /Trägerweit/)).toBeChecked();
    },
};

/** Internal group chats are switched off on the tile: visible, not changeable, with the reason. */
export const TileSwitchedOff: Story = {
    args: { disabled: true, initial: SERVED_DEFAULT },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        canvas.getAllByRole('radio').forEach((radio) => expect(radio).toBeDisabled());
        await expect(canvas.getByText('Nur verfügbar, wenn die Karte aktiviert ist.')).toBeVisible();
    },
};

export const English: Story = {
    args: { level: 'tenant', initial: { value: 'AGENCY', mode: 'SUGGESTED', inherited: true } },
    beforeEach: async () => {
        const previousLanguage = i18n.language;
        await i18n.changeLanguage('en');
        return () => i18n.changeLanguage(previousLanguage);
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByRole('radiogroup', { name: 'Recipients for internal group chats' })).toBeVisible();
        await expect(option(canvas, /Platform-wide/)).toBeEnabled();
        await expect(canvas.getByText('Counsellors can pick any colleague on the platform.')).toBeVisible();
        await expect(canvas.getByText('Inherited from the platform')).toBeVisible();
    },
};

/** Platform admin in English: the switch and the explanation of what each mode means. */
export const EnglishPlatformRequirement: Story = {
    args: { initial: { value: 'PLATFORM', mode: 'ENFORCED', inherited: false } },
    beforeEach: English.beforeEach,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByRole('button', { name: 'Requirement' })).toHaveAttribute('aria-pressed', 'true');
        await expect(canvas.getByText('Requirement: no Träger can change it.')).toBeVisible();
    },
};

/** Träger admin in English, locked by a platform requirement. */
export const EnglishTraegerLocked: Story = {
    args: { level: 'tenant', initial: { value: 'TENANT', mode: 'ENFORCED', inherited: true } },
    beforeEach: English.beforeEach,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        canvas.getAllByRole('radio').forEach((radio) => expect(radio).toBeDisabled());
        await expect(
            canvas.getByText('The platform sets this as a requirement. You can see it here but not change it.'),
        ).toBeVisible();
    },
};

/** Phone width (390px): nothing overlaps, every label and sentence wraps inside the tile. */
export const Phone390: Story = {
    args: { initial: { value: 'TENANT', mode: 'SUGGESTED', inherited: false } },
    globals: { viewport: { value: 'phone', isRotated: false } },
};
