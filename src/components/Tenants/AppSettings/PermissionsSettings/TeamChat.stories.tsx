import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState, type ComponentProps } from 'react';
import { http, HttpResponse } from 'msw';
// eslint-disable-next-line import/no-unresolved -- exports-map subpath the eslint node resolver can't see (resolves for tsc/Vite)
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { UseAppConfigProvider } from '../../../../context/useAppConfig';
import i18n from '../../../../i18n';
import { PermissionsSettingsView } from './PermissionsSettingsView';
import { DEFAULT_PERMISSION_SETTINGS } from './permissionsSettingsUtils';
import { TRAEGER_ONLY_SETTINGS, type TraegerOnlySettings } from './traegerFunctions';

/**
 * Frank, 2026-11-20: the Team-Chat (the counsellors' side chat on an open enquiry) gets the configuration
 * of supervision: a master switch plus "Konfigurieren", a dialog for what the side chat offers. TenantService
 * stores none of these features yet, so the dialog names them as prepared, without a switch.
 */
type ViewProps = ComponentProps<typeof PermissionsSettingsView>;

/** The Träger's own Team-Chat switch, kept in the story so it can be clicked through. */
const TraegerView = (props: ViewProps) => {
    const [on, setOn] = useState(true);
    const traegerSettings: TraegerOnlySettings = {
        source: 'own',
        values: { [TRAEGER_ONLY_SETTINGS.teamChat]: on },
        onChange: (_, value) => setOn(value),
    };
    return <PermissionsSettingsView {...props} traegerSettings={traegerSettings} />;
};

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
        initialValues: { settings: { ...DEFAULT_PERMISSION_SETTINGS } },
    },
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

const teamChatSection = async (canvasElement: HTMLElement) => {
    const mail = await within(canvasElement).findByTestId('chat-type-card-oneOnOne', {}, { timeout: 8000 });
    return within(mail).getByRole('group', { name: String(i18n.t('teamFunctions.chat.name')) });
};

/** Träger: the master switch and "Konfigurieren" in the Team-Chat section of the Mail Beratung tile. */
export const Traeger: Story = {
    render: (args) => <TraegerView {...args} />,
    play: async ({ canvasElement }) => {
        const section = await teamChatSection(canvasElement);
        section.scrollIntoView({ block: 'center' });
        await expect(
            within(section).getByRole('button', { name: String(i18n.t('tenants.permissions.teamChat.configure')) }),
        ).toBeEnabled();
    },
};

/** Träger: the open dialog. Every feature is named as prepared until TenantService stores it. */
export const ConfigureDialog: Story = {
    render: (args) => <TraegerView {...args} />,
    play: async ({ canvasElement }) => {
        const section = await teamChatSection(canvasElement);
        await userEvent.click(
            within(section).getByRole('button', { name: String(i18n.t('tenants.permissions.teamChat.configure')) }),
        );
        const body = within(canvasElement.ownerDocument.body);
        const dialog = await body.findByTestId('team-chat-dialog');
        await waitFor(() => expect(dialog).toBeVisible());
        await expect(dialog.querySelectorAll('[data-planned-feature]')).toHaveLength(7);
    },
};

/** Beratungsstelle: the Träger's master read-only; "Konfigurieren" follows it. */
export const Centre: Story = {
    args: {
        policyLevel: 'agency',
        traegerSettings: { source: 'traeger', status: 'success', values: { [TRAEGER_ONLY_SETTINGS.teamChat]: false } },
    },
    play: async ({ canvasElement }) => {
        const section = await teamChatSection(canvasElement);
        await expect(
            within(section).getByRole('button', { name: String(i18n.t('tenants.permissions.teamChat.configure')) }),
        ).toBeDisabled();
    },
};

/** Platform: the master is set per Träger; the dialog is there for what every Träger's side chat offers. */
export const Platform: Story = {
    args: { policyLevel: 'platform' },
};
