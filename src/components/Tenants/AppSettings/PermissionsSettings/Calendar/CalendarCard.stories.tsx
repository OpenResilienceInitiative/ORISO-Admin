import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- exports-map subpath the eslint node resolver can't see (resolves for tsc/Vite)
import { expect, userEvent, waitFor, within } from 'storybook/test';
import i18n from '../../../../../i18n';
import { findPopup } from '../../../../../test/storyPopups';
import type { CalendarPolicies } from '../../../../../types/permissionPolicy';
import { CalendarCard } from './CalendarCard';

/**
 * ADR-032 — the "Kalender" tile of Settings → Functionality Access: how far counsellors can show
 * colleagues' calendars (centre, Träger, platform) and whether colleagues also see the advice
 * seeker's username. Platform admins also choose Adjustable or Requirement; a Träger admin sees a
 * requirement locked. Each setting is saved explicitly, so a failed save keeps the edit.
 *
 * The stories run the tile inside a small harness that behaves like TenantService#365 (a save
 * returns the saved value, or fails).
 */

type Level = 'platform' | 'tenant';

const Harness = ({
    level,
    initial,
    failSave = false,
}: {
    level: Level;
    initial?: CalendarPolicies;
    failSave?: boolean;
}) => {
    const [policies, setPolicies] = useState(initial);
    return (
        <div style={{ maxWidth: 720, padding: 16 }}>
            <CalendarCard
                level={level}
                policies={policies}
                onSave={async (change) => {
                    if (failSave) throw new Error('rejected');
                    setPolicies((current) => ({
                        ...current,
                        ...Object.fromEntries(
                            Object.entries(change).map(([key, value]) => [key, { ...value, inherited: false }]),
                        ),
                    }));
                }}
            />
        </div>
    );
};

const meta = {
    title: 'Settings/Einstellungen/Funktionszugriff/CalendarCard',
    id: 'organisms-permissions-calendarcard',
    component: Harness,
    parameters: { layout: 'padded' },
    args: { level: 'tenant' },
    beforeEach: async () => {
        const previousLanguage = i18n.language;
        await i18n.changeLanguage('de');
        return () => i18n.changeLanguage(previousLanguage);
    },
} satisfies Meta<typeof Harness>;

export default meta;
type Story = StoryObj<typeof meta>;

/** What TenantService#365 serves to a Träger while nothing is set anywhere. */
const SERVED_DEFAULT: CalendarPolicies = {
    visibilityScope: { value: 'AGENCY', mode: 'SUGGESTED', inherited: true },
    showAskerUsernames: { value: false, mode: 'SUGGESTED', inherited: true },
};

const reach = (canvasElement: HTMLElement) =>
    within(within(canvasElement).getByTestId('calendar-visibility-scope-control'));
const usernames = (canvasElement: HTMLElement) =>
    within(within(canvasElement).getByTestId('calendar-asker-usernames-control'));

/** Nothing set anywhere: the counselling centre only, usernames hidden, both inherited. */
export const Default: Story = {
    args: { initial: SERVED_DEFAULT },
    play: async ({ canvasElement }) => {
        await expect(reach(canvasElement).getByRole('radio', { name: /Beratungsstelle/ })).toBeChecked();
        await expect(
            reach(canvasElement).getByText(
                'Wie weit Beratende die Kalender von Kolleg*innen einblenden können. Kolleg*innen sehen nur „belegt“ und die Art des Termins.',
            ),
        ).toBeVisible();
        await expect(
            usernames(canvasElement).getByRole('switch', { name: 'Benutzernamen der Ratsuchenden zeigen' }),
        ).not.toBeChecked();
        await expect(within(canvasElement).getAllByText('Von der Plattform geerbt')).toHaveLength(2);
    },
};

/** The Träger set its own reach and shows usernames: both marked as its own. */
export const TraegerValueSet: Story = {
    args: {
        initial: {
            visibilityScope: { value: 'TENANT', mode: 'SUGGESTED', inherited: false },
            showAskerUsernames: { value: true, mode: 'SUGGESTED', inherited: false },
        },
    },
    play: async ({ canvasElement }) => {
        await expect(reach(canvasElement).getByRole('radio', { name: /Träger/ })).toBeChecked();
        await expect(usernames(canvasElement).getByRole('switch')).toBeChecked();
        await expect(within(canvasElement).getAllByText('Von diesem Träger festgelegt')).toHaveLength(2);
    },
};

/** The Träger changes the reach and saves: the tile follows the saved value. */
export const TraegerSavesReach: Story = {
    args: { initial: SERVED_DEFAULT },
    play: async ({ canvasElement }) => {
        const scope = reach(canvasElement);
        await userEvent.click(scope.getByRole('radio', { name: /Plattform/ }));
        await userEvent.click(scope.getByRole('button', { name: 'Speichern' }));
        await waitFor(() => expect(scope.getByRole('button', { name: 'Speichern' })).toBeDisabled());
        await expect(scope.getByText('Von diesem Träger festgelegt')).toBeVisible();
    },
};

/** The platform enforces both: a Träger admin sees them locked, with the lock hint, and cannot save. */
export const PlatformEnforcedLocked: Story = {
    args: {
        initial: {
            visibilityScope: { value: 'TENANT', mode: 'ENFORCED', inherited: true },
            showAskerUsernames: { value: false, mode: 'ENFORCED', inherited: true },
        },
    },
    play: async ({ canvasElement }) => {
        const scope = reach(canvasElement);
        await expect(scope.getByRole('radio', { name: /Träger/ })).toBeChecked();
        scope.getAllByRole('radio').forEach((radio) => expect(radio).toBeDisabled());
        await expect(usernames(canvasElement).getByRole('switch')).toBeDisabled();
        await expect(
            usernames(canvasElement).getByText(/Die Plattform legt diese Einstellung als Vorgabe fest/),
        ).toBeVisible();
        await expect(within(canvasElement).queryByRole('button', { name: 'Speichern' })).toBeNull();
    },
};

/** Platform admin: each setting with the Adjustable/Requirement choice. */
export const PlatformRequirement: Story = {
    args: {
        level: 'platform',
        initial: {
            visibilityScope: { value: 'AGENCY', mode: 'SUGGESTED' },
            showAskerUsernames: { value: false, mode: 'ENFORCED' },
        },
    },
    play: async ({ canvasElement }) => {
        await expect(reach(canvasElement).getByRole('button', { name: 'Anpassbar' })).toHaveAttribute(
            'aria-pressed',
            'true',
        );
        await expect(usernames(canvasElement).getByRole('button', { name: 'Vorgabe' })).toHaveAttribute(
            'aria-pressed',
            'true',
        );
    },
};

/** The server rejects the save: an error says so, and the switch stays where the admin left it. */
export const SaveFails: Story = {
    args: { failSave: true, initial: SERVED_DEFAULT },
    play: async ({ canvasElement }) => {
        const toggle = usernames(canvasElement);
        await userEvent.click(toggle.getByRole('switch'));
        await userEvent.click(toggle.getByRole('button', { name: 'Speichern' }));
        await expect(await findPopup(canvasElement, /Nicht gespeichert\./, 'error')).toHaveTextContent(
            'Berechtigungen',
        );
        await expect(toggle.getByRole('switch')).toBeChecked();
        await expect(toggle.getByRole('button', { name: 'Speichern' })).toBeEnabled();
    },
};

export const English: Story = {
    args: { initial: SERVED_DEFAULT },
    beforeEach: async () => {
        const previousLanguage = i18n.language;
        await i18n.changeLanguage('en');
        return () => i18n.changeLanguage(previousLanguage);
    },
    play: async ({ canvasElement }) => {
        await expect(
            reach(canvasElement).getByRole('radiogroup', { name: "Reach of colleagues' calendars" }),
        ).toBeVisible();
        await expect(
            usernames(canvasElement).getByRole('switch', { name: "Show advice seekers' usernames" }),
        ).toBeVisible();
    },
};

/** Phone width (390px): nothing overlaps, every label and sentence wraps inside the tile. */
export const Phone390: Story = {
    args: { initial: SERVED_DEFAULT },
    globals: { viewport: { value: 'phone', isRotated: false } },
};
