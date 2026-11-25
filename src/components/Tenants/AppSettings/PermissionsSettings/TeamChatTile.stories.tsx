import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
// eslint-disable-next-line import/no-unresolved -- exports-map subpath the eslint node resolver can't see (resolves for tsc/Vite)
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import i18n from '../../../../i18n';
import type { PolicyValue } from '../../../../types/permissionPolicy';
import { TEAM_FUNCTIONS } from '../../../TeamFunctions';
import type { EffectivePolicy } from './permissionsSettingsUtils';
import { TeamChatTile } from './TeamChatTile';
import { TEAM_CHAT_AFTER_ACCEPT, TEAM_CHAT_FEATURES, TEAM_CHAT_MASTER } from './traegerFunctions';

/**
 * ORISO-Frontend#2491 — design proposal (Frank, 2026-11-24): the Team-Chat tile on Funktionszugriff follows the
 * former Supervision tile (now a section of the Mail-Beratung tile, Frank 2026-11-25). Icon, title and status chip ("An · läuft nach Annahme: aus"); only the master
 * switch in the tile; "Konfigurieren" opens the same dialog as supervision. In the dialog: "Team-Chat läuft nach
 * der Annahme weiter" (default off, data-protection question first) and what the side chat offers, each with
 * its own "Anpassbar"/"Vorgabe" on platform, Träger and Beratungsstelle.
 *
 * Approved by Frank on 2026-11-24; no extra Team-Chat switch on the Mail Beratung tile (option B).
 */
type Level = 'platform' | 'tenant' | 'agency';
type HarnessProps = {
    level: Level;
    initial: Record<string, EffectivePolicy>;
    onPoliciesChange: (changes: Record<string, PolicyValue<boolean>>) => void;
};

const own = (value: boolean): EffectivePolicy => ({ value, mode: 'SUGGESTED', inherited: false });
const requiredFromAbove = (value: boolean): EffectivePolicy => ({ value, mode: 'ENFORCED', inherited: true });

const allOn = (fields: string[]) => Object.fromEntries(fields.map((field) => [field, own(true)]));
const TEAM_CHAT_ON = {
    [TEAM_CHAT_MASTER]: own(true),
    [TEAM_CHAT_AFTER_ACCEPT]: own(false),
    ...allOn(TEAM_CHAT_FEATURES.map((feature) => feature.field)),
};

/** Keeps the saved policies in the story, so the switch, the chip and the dialog can be clicked through. */
const Harness = ({ level, initial, onPoliciesChange }: HarnessProps) => {
    const [policies, setPolicies] = useState<Record<string, EffectivePolicy>>(initial);
    const props = {
        level,
        policyOf: (field: string) => policies[field] ?? own(false),
        pending: () => false,
        onChange: (changes: Record<string, PolicyValue<boolean>>) => {
            setPolicies((current) => ({ ...current, ...changes }));
            onPoliciesChange(changes);
        },
    };
    return (
        <div style={{ display: 'grid', gap: 16, maxWidth: 1240 }}>
            <TeamChatTile {...props} />
        </div>
    );
};

const meta = {
    title: 'Settings/Einstellungen/Funktionszugriff/TeamChatTile',
    id: 'organisms-permissions-teamchattile',
    component: Harness,
    parameters: { layout: 'padded' },
    args: { level: 'tenant', initial: TEAM_CHAT_ON, onPoliciesChange: fn() },
    beforeEach: async () => {
        const previousLanguage = i18n.language;
        await i18n.changeLanguage('de');
        return () => i18n.changeLanguage(previousLanguage);
    },
} satisfies Meta<typeof Harness>;

export default meta;
type Story = StoryObj<typeof meta>;

const english = async () => {
    const previousLanguage = i18n.language;
    await i18n.changeLanguage('en');
    return () => i18n.changeLanguage(previousLanguage);
};
const phone = { viewport: { value: 'phone', isRotated: false } };

const name = () => String(i18n.t(TEAM_FUNCTIONS.chat.nameKey));
const tile = (canvasElement: HTMLElement) => within(canvasElement).getByTestId('team-chat-tile');
const configure = () => String(i18n.t('tenants.permissions.teamChat.configure'));
const afterAcceptLabel = () => String(i18n.t('tenants.permissions.teamChat.afterAccept.label', { name: name() }));
const switchOn = (label: string) =>
    `${label}: ${String(i18n.t('tenants.permissions.policy.deactivated'))} – ${String(
        i18n.t('tenants.permissions.policy.activate'),
    )}`;
const openDialog = async (canvasElement: HTMLElement) => {
    await userEvent.click(within(tile(canvasElement)).getByRole('button', { name: configure() }));
    return within(await within(canvasElement.ownerDocument.body).findByTestId('team-chat-dialog'));
};

/** Träger, Desktop: on, closes at acceptance. The chip says both; only the master switch is in the tile. */
export const Traeger: Story = {
    play: async ({ canvasElement }) => {
        const card = within(tile(canvasElement));
        await expect(card.getByText('An · läuft nach Annahme: aus')).toBeVisible();
        await expect(card.queryByText(afterAcceptLabel())).not.toBeInTheDocument();
        await expect(card.getByRole('button', { name: configure() })).toBeEnabled();
    },
};

/** Switched off: chip "Aus", "Konfigurieren" waits for the switch. */
export const Off: Story = {
    args: { initial: { ...TEAM_CHAT_ON, [TEAM_CHAT_MASTER]: own(false) } },
    play: async ({ canvasElement }) => {
        const card = within(tile(canvasElement));
        await expect(card.getByText('Aus')).toBeVisible();
        await expect(card.getByRole('button', { name: configure() })).toBeDisabled();
    },
};

/** "Konfigurieren": after acceptance first, then what the side chat offers — the supervision dialog. */
export const ConfigureDialog: Story = {
    play: async ({ canvasElement }) => {
        const dialog = await openDialog(canvasElement);
        // The dialog fades in.
        await waitFor(() => expect(dialog.getByRole('button', { name: switchOn(afterAcceptLabel()) })).toBeVisible());
        const videoCalls = String(i18n.t('tenants.permissions.feature.videoCalls'));
        await expect(dialog.getAllByRole('button', { name: new RegExp(`^${videoCalls}: `) })).toHaveLength(2);
    },
};

/** In the dialog, switching "läuft nach der Annahme weiter" on asks the data-protection question first. */
export const AfterAcceptPrivacyConfirm: Story = {
    play: async ({ canvasElement, args }) => {
        const dialog = await openDialog(canvasElement);
        await userEvent.click(dialog.getByRole('button', { name: switchOn(afterAcceptLabel()) }));
        const body = within(canvasElement.ownerDocument.body);
        const title = await body.findByText(
            String(i18n.t('tenants.permissions.teamChat.afterAccept.confirm.title', { name: name() })),
        );
        await waitFor(() => expect(title).toBeVisible());
        await expect(args.onPoliciesChange).not.toHaveBeenCalled();
    },
};

/** Confirmed and saved: the chip now reads "läuft nach Annahme: an". */
export const AfterAcceptOnSaved: Story = {
    play: async ({ canvasElement, args }) => {
        const dialog = await openDialog(canvasElement);
        await userEvent.click(dialog.getByRole('button', { name: switchOn(afterAcceptLabel()) }));
        const body = within(canvasElement.ownerDocument.body);
        await userEvent.click(
            await body.findByRole('button', {
                name: String(i18n.t('tenants.permissions.teamChat.afterAccept.confirm.confirm')),
            }),
        );
        await userEvent.click(
            dialog.getByRole('button', { name: String(i18n.t('tenants.permissions.teamChat.save')) }),
        );
        await waitFor(() =>
            expect(args.onPoliciesChange).toHaveBeenCalledWith({
                [TEAM_CHAT_AFTER_ACCEPT]: expect.objectContaining({ value: true }),
            }),
        );
        await expect(within(tile(canvasElement)).getByText('An · läuft nach Annahme: an')).toBeVisible();
    },
};

/** Platform: the master can be a preset or a requirement for every Träger. */
export const Platform: Story = { args: { level: 'platform' } };

/** Beratungsstelle: the Träger requires the Team-Chat; the master is locked, the dialog still opens. */
export const CentreRequiredByTraeger: Story = {
    args: { level: 'agency', initial: { ...TEAM_CHAT_ON, [TEAM_CHAT_MASTER]: requiredFromAbove(true) } },
};

/** English, desktop. */
export const English: Story = {
    beforeEach: english,
    play: async ({ canvasElement }) => {
        await expect(within(tile(canvasElement)).getByText('On · after acceptance: off')).toBeVisible();
    },
};

/** German, phone width (390px): chip, switch and button wrap inside the tile. */
export const Phone390: Story = { globals: phone };

/** English, phone width (390px). */
export const Phone390English: Story = { beforeEach: english, globals: phone };

/** The dialog at phone width (German). */
export const Phone390ConfigureDialog: Story = { globals: phone, play: ConfigureDialog.play };
