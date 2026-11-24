import ForumOutlinedIcon from '@mui/icons-material/ForumOutlined';
import MailOutlinedIcon from '@mui/icons-material/MailOutlined';
import SupervisorAccountOutlinedIcon from '@mui/icons-material/SupervisorAccountOutlined';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
// eslint-disable-next-line import/no-unresolved -- exports-map subpath the eslint node resolver can't see (resolves for tsc/Vite)
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { CollapsibleTile } from '../../../CollapsibleTile';
import i18n from '../../../../i18n';
import type { PolicyValue } from '../../../../types/permissionPolicy';
import { TEAM_FUNCTIONS } from '../../../TeamFunctions';
import type { EffectivePolicy } from './permissionsSettingsUtils';
import { PolicyOptionCard } from './PolicyOptionCard';
import { SupervisionTile } from './SupervisionTile';
import { TeamChatTile } from './TeamChatTile';
import {
    SUPERVISION_FEATURES,
    SUPERVISION_MASTER,
    TEAM_CHAT_AFTER_ACCEPT,
    TEAM_CHAT_FEATURES,
    TEAM_CHAT_MASTER,
} from './traegerFunctions';
import permissionStyles from './styles.module.scss';

/**
 * ORISO-Frontend#2491 — design proposal (Frank, 2026-11-24): the Team-Chat tile on Funktionszugriff follows the
 * Supervision tile exactly. Icon, title and status chip ("An · läuft nach Annahme: aus"); only the master
 * switch in the tile; "Konfigurieren" opens the same dialog as supervision. In the dialog: "Team-Chat läuft nach
 * der Annahme weiter" (default off, data-protection question first) and what the side chat offers, each with
 * its own "Anpassbar"/"Vorgabe" on platform, Träger and Beratungsstelle.
 *
 * Design only: the page still shows the old section until this is approved and wired.
 */
type Level = 'platform' | 'tenant' | 'agency';
type HarnessProps = {
    level: Level;
    initial: Record<string, EffectivePolicy>;
    withSupervision?: boolean;
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
const Harness = ({ level, initial, withSupervision, onPoliciesChange }: HarnessProps) => {
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
            {withSupervision && <SupervisionTile {...props} />}
            <TeamChatTile {...props} />
        </div>
    );
};

const meta = {
    title: 'Settings/Einstellungen/Funktionszugriff/TeamChatTile (Entwurf)',
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

/** Side by side with the Supervision tile: the same shape, the same "Konfigurieren". */
export const NextToSupervision: Story = {
    args: {
        withSupervision: true,
        initial: {
            ...TEAM_CHAT_ON,
            [SUPERVISION_MASTER]: own(true),
            ...allOn(SUPERVISION_FEATURES.map((feature) => feature.field)),
        },
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

/**
 * Option for Frank (separate decision, 2026-11-24): a small "Team-Chat" switch on the Mail Beratung tile, built
 * exactly like the small "Supervision" switch there. Supervision today: the small switch on the Mail Beratung
 * tile and the Supervision tile are two separate settings; neither locks the other, and supervision works in a
 * mail conversation only while BOTH are on. The grey box under the tiles is story-only: it says what
 * counsellors get with the current switches. Sketch — today the Mail Beratung tile has no Team-Chat switch and
 * TenantService has no such setting.
 */
const MAIL_SUPERVISION = 'mailSupervisionSketch';
const MAIL_TEAM_CHAT = 'mailTeamChatSketch';

const resultStyle = {
    margin: 0,
    padding: '12px 16px',
    borderRadius: 12,
    background: 'var(--m3-surface-container, #f0eded)',
    fontSize: 14,
    lineHeight: '20px',
} as const;

const Effect = ({ label, parts }: { label: string; parts: Array<[string, boolean]> }) => {
    const on = parts.every(([, value]) => value);
    const missing = parts.filter(([, value]) => !value).map(([part]) => part);
    return (
        <li>
            <strong>{label}:</strong> {on ? 'verfügbar' : `nicht verfügbar – aus: ${missing.join(' und ')}`}
        </li>
    );
};

const MailTileOption = ({ withTeamChatSwitch }: { withTeamChatSwitch: boolean }) => {
    const [policies, setPolicies] = useState<Record<string, EffectivePolicy>>({
        ...TEAM_CHAT_ON,
        [SUPERVISION_MASTER]: own(true),
        ...allOn(SUPERVISION_FEATURES.map((feature) => feature.field)),
        [MAIL_SUPERVISION]: own(true),
        [MAIL_TEAM_CHAT]: own(true),
    });
    const set = (changes: Record<string, PolicyValue<boolean>>) =>
        setPolicies((current) => ({ ...current, ...changes }));
    const tileProps = {
        level: 'tenant' as const,
        policyOf: (field: string) => policies[field] ?? own(false),
        pending: () => false,
        onChange: set,
    };
    const mailTile = String(i18n.t('tenants.permissions.card.oneOnOne.title'));
    const supervisionTile = String(i18n.t('tenants.permissions.supervision.title'));
    const value = (field: string) => Boolean(policies[field]?.value);
    return (
        <div style={{ display: 'grid', gap: 16, maxWidth: 1240 }}>
            <CollapsibleTile
                icon={<MailOutlinedIcon />}
                title={mailTile}
                status={String(i18n.t('tenants.permissions.card.summary.onPlain'))}
                defaultOpen
            >
                <div className={permissionStyles.togglesList}>
                    <PolicyOptionCard
                        Icon={SupervisorAccountOutlinedIcon}
                        featureKey={MAIL_SUPERVISION}
                        label={String(i18n.t('tenants.permissions.feature.supervision'))}
                        supportingText={String(i18n.t('tenants.permissions.featureDescription.supervision'))}
                        level="tenant"
                        policy={policies[MAIL_SUPERVISION]}
                        onChange={(next) => set({ [MAIL_SUPERVISION]: next })}
                    />
                    {withTeamChatSwitch && (
                        <PolicyOptionCard
                            Icon={ForumOutlinedIcon}
                            featureKey={MAIL_TEAM_CHAT}
                            label={name()}
                            supportingText="Beratende stimmen sich bei Anfragen in der Mail Beratung im Team ab."
                            level="tenant"
                            policy={policies[MAIL_TEAM_CHAT]}
                            onChange={(next) => set({ [MAIL_TEAM_CHAT]: next })}
                        />
                    )}
                </div>
            </CollapsibleTile>
            <SupervisionTile {...tileProps} />
            <TeamChatTile {...tileProps} />
            <div style={resultStyle} data-testid="mail-effect">
                <p style={{ margin: '0 0 4px' }}>So wirkt es für Beratende in der {mailTile}:</p>
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                    <Effect
                        label={supervisionTile}
                        parts={[
                            [`Schalter auf „${mailTile}“`, value(MAIL_SUPERVISION)],
                            [`Kachel „${supervisionTile}“`, value(SUPERVISION_MASTER)],
                        ]}
                    />
                    <Effect
                        label={name()}
                        parts={[
                            ...(withTeamChatSwitch
                                ? ([[`Schalter auf „${mailTile}“`, value(MAIL_TEAM_CHAT)]] as Array<[string, boolean]>)
                                : []),
                            [`Kachel „${name()}“`, value(TEAM_CHAT_MASTER)],
                        ]}
                    />
                    <Effect
                        label={`${name()} nach der Annahme`}
                        parts={[
                            ...(withTeamChatSwitch
                                ? ([[`Schalter auf „${mailTile}“`, value(MAIL_TEAM_CHAT)]] as Array<[string, boolean]>)
                                : []),
                            [`Kachel „${name()}“`, value(TEAM_CHAT_MASTER)],
                            ['„läuft nach der Annahme weiter“', value(TEAM_CHAT_AFTER_ACCEPT)],
                        ]}
                    />
                </ul>
            </div>
        </div>
    );
};

type OptionStory = StoryObj<typeof MailTileOption>;
const mailSwitch = (canvasElement: HTMLElement) =>
    within(canvasElement).getByRole('button', {
        name: `${name()}: ${String(i18n.t('tenants.permissions.policy.activated'))} – ${String(
            i18n.t('tenants.permissions.policy.deactivate'),
        )}`,
    });

/** Option A — with the small switch, like Supervision: both must be on; switching the small one off stops it. */
export const OptionWithMailTileSwitch: OptionStory = {
    name: 'Option A: mit Schalter auf Mail Beratung',
    render: () => <MailTileOption withTeamChatSwitch />,
    play: async ({ canvasElement }) => {
        await expect(within(canvasElement).getByTestId('mail-effect').textContent).toContain(`${name()}: verfügbar`);
        await userEvent.click(mailSwitch(canvasElement));
        await waitFor(() =>
            expect(within(canvasElement).getByTestId('mail-effect').textContent).toContain(
                `${name()}: nicht verfügbar – aus: Schalter auf`,
            ),
        );
        // The Team-Chat tile itself does not change: like Supervision, neither switch locks the other.
        await expect(within(tile(canvasElement)).getByText('An · läuft nach Annahme: aus')).toBeVisible();
    },
};

/** Option B — without: only the Team-Chat tile decides. The Mail Beratung tile keeps only Supervision. */
export const OptionWithoutMailTileSwitch: OptionStory = {
    name: 'Option B: ohne Schalter (nur Kachel)',
    render: () => <MailTileOption withTeamChatSwitch={false} />,
    play: async ({ canvasElement }) => {
        await expect(within(canvasElement).getAllByText(name()).length).toBeGreaterThan(0);
        await expect(within(canvasElement).getByTestId('mail-effect').textContent).toContain(`${name()}: verfügbar`);
    },
};

export const OptionWithMailTileSwitchPhone: OptionStory = {
    name: 'Option A: mit Schalter (Phone 390)',
    globals: phone,
    render: () => <MailTileOption withTeamChatSwitch />,
};

export const OptionWithoutMailTileSwitchPhone: OptionStory = {
    name: 'Option B: ohne Schalter (Phone 390)',
    globals: phone,
    render: () => <MailTileOption withTeamChatSwitch={false} />,
};
