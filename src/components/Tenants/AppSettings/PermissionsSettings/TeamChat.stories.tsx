import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState, type ComponentProps } from 'react';
import { http, HttpResponse } from 'msw';
// eslint-disable-next-line import/no-unresolved -- exports-map subpath the eslint node resolver can't see (resolves for tsc/Vite)
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { UseAppConfigProvider } from '../../../../context/useAppConfig';
import i18n from '../../../../i18n';
import type { PolicyValue } from '../../../../types/permissionPolicy';
import { PermissionsSettingsView } from './PermissionsSettingsView';
import { DEFAULT_PERMISSION_SETTINGS } from './permissionsSettingsUtils';
import { TEAM_CHAT_AFTER_ACCEPT, TEAM_CHAT_FEATURES, TEAM_CHAT_MASTER } from './traegerFunctions';

/**
 * ORISO-Frontend#2491 (Frank, 2026-11-23/24): the Team-Chat (the counsellors' side chat on an open enquiry) is
 * controlled exactly like supervision, as its own tile after the supervision tile (`TeamChatTile`). Its master is a permission policy on platform, Träger and
 * Beratungsstelle (`PermissionPolicyControl`), and "Konfigurieren" opens what the side chat offers, each
 * feature with its own "Anpassbar"/"Vorgabe", saved together on "Speichern".
 */
type ViewProps = ComponentProps<typeof PermissionsSettingsView>;

/** Keeps the saved policies in the story, so the switches, locks and the dialog can be clicked through. */
const StatefulView = (props: ViewProps) => {
    const [policies, setPolicies] = useState<Record<string, PolicyValue<boolean>>>(props.permissionPolicies ?? {});
    const save = (changes: Record<string, PolicyValue<boolean>>) => {
        setPolicies((current) => ({ ...current, ...changes }));
        props.onPoliciesChange?.(changes);
    };
    return (
        <PermissionsSettingsView
            {...props}
            permissionPolicies={policies}
            onPolicyChange={(field, policy) => save({ [field]: policy })}
            onPoliciesChange={save}
        />
    );
};

const own = (value: boolean): PolicyValue<boolean> => ({ value, mode: 'SUGGESTED', inherited: false });

const meta = {
    title: 'Settings/Einstellungen/Funktionszugriff/TeamChat',
    id: 'organisms-permissions-teamchat',
    component: PermissionsSettingsView,
    parameters: {
        layout: 'fullscreen',
        msw: { handlers: [http.get('*/service/users/case-handover/reason-policies', () => HttpResponse.json([]))] },
    },
    args: {
        tenantId: '7',
        isLoading: false,
        // Only the Mail Beratung tile above the tiles that follow the conversation types (supervision, Team-Chat).
        excludeCardKeys: ['liveChat', 'group', 'groupInternal'],
        formStateKey: 'team-chat-story',
        restrictedFields: new Set<string>(),
        onToggleUpdate: fn(),
        onPolicyChange: fn(),
        onPoliciesChange: fn(),
        initialValues: { settings: { ...DEFAULT_PERMISSION_SETTINGS } },
        permissionPolicies: { [TEAM_CHAT_MASTER]: own(true) },
    },
    render: (args) => <StatefulView {...args} />,
    decorators: [
        (Story) => (
            <UseAppConfigProvider>
                <Story />
            </UseAppConfigProvider>
        ),
    ],
} satisfies Meta<typeof PermissionsSettingsView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The master in the tile is named like the supervision master: "Aktiviert". */
const label = String(i18n.t('tenants.permissions.card.activated'));
/** The round switch of a setting that is on, as `PermissionPolicyControl` names it. */
const switchOff = (name: string) =>
    `${name}: ${String(i18n.t('tenants.permissions.policy.activated'))} – ${String(
        i18n.t('tenants.permissions.policy.deactivate'),
    )}`;
const switchOn = (name: string) =>
    `${name}: ${String(i18n.t('tenants.permissions.policy.deactivated'))} – ${String(
        i18n.t('tenants.permissions.policy.activate'),
    )}`;
const configureName = () => String(i18n.t('tenants.permissions.teamChat.configure'));
const withName = () => ({ name: String(i18n.t('teamFunctions.chat.name')) });
const afterAcceptLabel = () => String(i18n.t('tenants.permissions.teamChat.afterAccept.label', withName()));

const teamChatTile = async (canvasElement: HTMLElement) => {
    const tile = await within(canvasElement).findByTestId('team-chat-tile', {}, { timeout: 8000 });
    tile.scrollIntoView({ block: 'center' });
    return within(tile);
};
const openDialog = async (canvasElement: HTMLElement) => {
    const tile = await teamChatTile(canvasElement);
    await userEvent.click(tile.getByRole('button', { name: configureName() }));
    const dialog = await within(canvasElement.ownerDocument.body).findByTestId('team-chat-dialog');
    await waitFor(() => expect(dialog).toBeVisible());
    return within(dialog);
};

/** Platform: preset for every Träger; the lock turns it into a requirement, as for supervision. */
export const Platform: Story = {
    args: { policyLevel: 'platform', permissionPolicies: { [TEAM_CHAT_MASTER]: own(true) } },
    play: async ({ canvasElement, args }) => {
        const tile = await teamChatTile(canvasElement);
        // Switch and lock, as on the supervision tile.
        await expect(tile.getAllByRole('button', { name: new RegExp(`^${label}: `) })).toHaveLength(2);
        const makeRequired = `${label}: ${String(i18n.t('tenants.permissions.policy.suggestion'))} – ${String(
            i18n.t('tenants.permissions.policy.makeRequired'),
        )}`;
        await userEvent.click(tile.getByRole('button', { name: makeRequired }));
        await waitFor(() =>
            expect(args.onPoliciesChange).toHaveBeenCalledWith({
                [TEAM_CHAT_MASTER]: expect.objectContaining({ value: true, mode: 'ENFORCED' }),
            }),
        );
    },
};

/** Träger: own value, adjustable for its Beratungsstellen; "Konfigurieren" is available while it is on. */
export const Traeger: Story = {
    play: async ({ canvasElement }) => {
        const tile = await teamChatTile(canvasElement);
        await expect(tile.getByRole('button', { name: configureName() })).toBeEnabled();
        // Only the master is in the tile; "after acceptance" sits in the dialog.
        await expect(tile.queryByRole('button', { name: new RegExp(`^${afterAcceptLabel()}: `) })).toBeNull();
    },
};

/** Träger: switched off, "Konfigurieren" waits for the switch. */
export const TraegerSwitchedOff: Story = {
    args: { permissionPolicies: { [TEAM_CHAT_MASTER]: own(false) } },
    play: async ({ canvasElement }) => {
        const tile = await teamChatTile(canvasElement);
        await expect(tile.getByRole('button', { name: configureName() })).toBeDisabled();
        await expect(tile.getByText(String(i18n.t('tenants.permissions.teamChat.configureNeedsMaster')))).toBeVisible();
    },
};

/** Träger: the dialog offers every feature as a stored policy and saves the changes together. */
export const ConfigureDialog: Story = {
    play: async ({ canvasElement, args }) => {
        const dialog = await openDialog(canvasElement);
        // Nothing is "prepared" any more: TenantService stores every feature (TenantService#405).
        await expect(dialog.queryByText(String(i18n.t('tenants.permissions.feature.planned')))).toBeNull();
        const videoCalls = String(i18n.t(TEAM_CHAT_FEATURES[0].labelKey));
        await userEvent.click(dialog.getByRole('button', { name: switchOff(videoCalls) }));
        await userEvent.click(
            dialog.getByRole('button', { name: String(i18n.t('tenants.permissions.teamChat.save')) }),
        );
        await waitFor(() =>
            expect(args.onPoliciesChange).toHaveBeenCalledWith(
                expect.objectContaining({ featureVideoCallsTeamDiscussionsEnabled: expect.anything() }),
            ),
        );
    },
};

/** Beratungsstelle: its own value as long as the Träger leaves it adjustable; no lock at this level. */
export const Centre: Story = {
    args: {
        policyLevel: 'agency',
        permissionPolicies: { [TEAM_CHAT_MASTER]: { value: true, mode: 'SUGGESTED', inherited: true } },
    },
    play: async ({ canvasElement }) => {
        const tile = await teamChatTile(canvasElement);
        await expect(tile.getAllByRole('button', { name: new RegExp(`^${label}: `) })).toHaveLength(1);
        await expect(tile.getByRole('button', { name: configureName() })).toBeEnabled();
    },
};

/** Beratungsstelle: the Träger requires the team chat off; the centre sees it read-only. */
export const CentreRequiredByTraeger: Story = {
    args: {
        policyLevel: 'agency',
        restrictedFields: new Set<string>([TEAM_CHAT_MASTER]),
        initialValues: { settings: { ...DEFAULT_PERMISSION_SETTINGS, [TEAM_CHAT_MASTER]: false } },
        permissionPolicies: { [TEAM_CHAT_MASTER]: { value: false, mode: 'ENFORCED', inherited: true } },
    },
    play: async ({ canvasElement }) => {
        const tile = await teamChatTile(canvasElement);
        await expect(tile.getByRole('button', { name: new RegExp(`^${label}: `) })).toBeDisabled();
        await expect(tile.getByRole('button', { name: configureName() })).toBeDisabled();
    },
};

/**
 * Träger, Frank 2026-11-23: "Team-Chat läuft nach der Annahme weiter", in the dialog. Switching it on first asks
 * the same data-protection question as supervision; the story stops with the question open.
 */
export const AfterAcceptConfirm: Story = {
    play: async ({ canvasElement, args }) => {
        const dialog = await openDialog(canvasElement);
        await userEvent.click(dialog.getByRole('button', { name: switchOn(afterAcceptLabel()) }));
        const body = within(canvasElement.ownerDocument.body);
        const title = await body.findByText(
            String(i18n.t('tenants.permissions.teamChat.afterAccept.confirm.title', withName())),
        );
        await waitFor(() => expect(title).toBeVisible());
        await expect(args.onPoliciesChange).not.toHaveBeenCalled();
    },
};

/** Träger: confirmed and saved — the chip says the team chat continues after acceptance. */
export const AfterAcceptOn: Story = {
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
        const tile = await teamChatTile(canvasElement);
        await expect(
            tile.getByText(
                String(
                    i18n.t('tenants.permissions.teamChat.summary.on', {
                        afterAccept: i18n.t('tenants.permissions.teamChat.summary.afterAcceptOn'),
                    }),
                ),
            ),
        ).toBeVisible();
    },
};

/** Beratungsstelle: the Träger requires "after acceptance"; the centre sees it locked in the dialog. */
export const CentreAfterAcceptRequiredByTraeger: Story = {
    args: {
        policyLevel: 'agency',
        permissionPolicies: {
            [TEAM_CHAT_MASTER]: { value: true, mode: 'SUGGESTED', inherited: true },
            [TEAM_CHAT_AFTER_ACCEPT]: { value: true, mode: 'ENFORCED', inherited: true },
        },
    },
    play: async ({ canvasElement }) => {
        const dialog = await openDialog(canvasElement);
        await expect(dialog.getByRole('button', { name: new RegExp(`^${afterAcceptLabel()}: `) })).toBeDisabled();
    },
};
