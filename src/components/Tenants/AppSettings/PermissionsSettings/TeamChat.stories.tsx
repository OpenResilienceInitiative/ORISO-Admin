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
import { TEAM_CHAT_FEATURES, TEAM_CHAT_MASTER } from './traegerFunctions';

/**
 * ORISO-Frontend#2491 (Frank, 2026-11-23): the Team-Chat (the counsellors' side chat on an open enquiry) is
 * controlled exactly like supervision. Its master is a permission policy on platform, Träger and
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
        // The Mail Beratung tile only: the Team-Chat is one of its sections.
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

const label = String(i18n.t('teamFunctions.chat.name'));
/** The round switch of a setting that is on, as `PermissionPolicyControl` names it. */
const switchOff = (name: string) =>
    `${name}: ${String(i18n.t('tenants.permissions.policy.activated'))} – ${String(
        i18n.t('tenants.permissions.policy.deactivate'),
    )}`;
const configureName = () => String(i18n.t('tenants.permissions.teamChat.configure'));

const teamChatSection = async (canvasElement: HTMLElement) => {
    const mail = await within(canvasElement).findByTestId('chat-type-card-oneOnOne', {}, { timeout: 8000 });
    const section = within(mail).getByRole('group', { name: label });
    section.scrollIntoView({ block: 'center' });
    return within(section);
};

/** Platform: preset for every Träger; the lock turns it into a requirement, as for supervision. */
export const Platform: Story = {
    args: { policyLevel: 'platform', permissionPolicies: { [TEAM_CHAT_MASTER]: own(true) } },
    play: async ({ canvasElement, args }) => {
        const section = await teamChatSection(canvasElement);
        // Switch and lock, as on the supervision tile.
        await expect(section.getAllByRole('button', { name: new RegExp(`^${label}: `) })).toHaveLength(2);
        // The lock makes it a requirement for every Träger.
        const makeRequired = `${label}: ${String(i18n.t('tenants.permissions.policy.suggestion'))} – ${String(
            i18n.t('tenants.permissions.policy.makeRequired'),
        )}`;
        await userEvent.click(section.getByRole('button', { name: makeRequired }));
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
        const section = await teamChatSection(canvasElement);
        await expect(section.getByRole('button', { name: configureName() })).toBeEnabled();
    },
};

/** Träger: switching the master off saves the policy and leaves "Konfigurieren" disabled. */
export const TraegerSwitchedOff: Story = {
    args: { permissionPolicies: { [TEAM_CHAT_MASTER]: own(false) } },
    play: async ({ canvasElement }) => {
        const section = await teamChatSection(canvasElement);
        await expect(section.getByRole('button', { name: configureName() })).toBeDisabled();
        await expect(
            section.getByText(String(i18n.t('tenants.permissions.teamChat.configureNeedsMaster'))),
        ).toBeVisible();
    },
};

/** Träger: the dialog offers every feature as a stored policy and saves the changes together. */
export const ConfigureDialog: Story = {
    play: async ({ canvasElement, args }) => {
        const section = await teamChatSection(canvasElement);
        await userEvent.click(section.getByRole('button', { name: configureName() }));
        const body = within(canvasElement.ownerDocument.body);
        const dialog = await body.findByTestId('team-chat-dialog');
        await waitFor(() => expect(dialog).toBeVisible());
        // Nothing is "prepared" any more: TenantService stores every feature (TenantService#405).
        await expect(dialog.querySelectorAll('[data-planned-feature]')).toHaveLength(0);
        await expect(dialog.textContent).not.toContain(String(i18n.t('tenants.permissions.feature.planned')));
        const videoCalls = String(i18n.t(TEAM_CHAT_FEATURES[0].labelKey));
        await userEvent.click(within(dialog).getByRole('button', { name: switchOff(videoCalls) }));
        await userEvent.click(
            within(dialog).getByRole('button', { name: String(i18n.t('tenants.permissions.teamChat.save')) }),
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
        const section = await teamChatSection(canvasElement);
        await expect(section.getAllByRole('button', { name: new RegExp(`^${label}: `) })).toHaveLength(1);
        await expect(section.getByRole('button', { name: configureName() })).toBeEnabled();
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
        const section = await teamChatSection(canvasElement);
        const master = section.getByRole('button', { name: new RegExp(`^${label}: `) });
        await expect(master).toBeDisabled();
        await expect(section.getByRole('button', { name: configureName() })).toBeDisabled();
    },
};
