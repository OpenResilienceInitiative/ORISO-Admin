import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- exports-map subpath the eslint node resolver can't see (resolves for tsc/Vite)
import { fn } from 'storybook/test';
import { UseAppConfigProvider } from '../../../../context/useAppConfig';
import { PermissionsSettingsView } from './PermissionsSettingsView';
import { DEFAULT_PERMISSION_SETTINGS, getForcedOffFields } from './permissionsSettingsUtils';

const filledSettings = { ...DEFAULT_PERMISSION_SETTINGS };

const meta = {
    title: 'Organisms/Permissions/PermissionsSettings',
    component: PermissionsSettingsView,
    parameters: {
        layout: 'fullscreen',
        design: {
            type: 'multi',
            designs: [
                {
                    name: 'Permissions panel',
                    type: 'figma',
                    url: 'https://www.figma.com/design/QfsgojtHQzBjbzU3Im9Cet/Admin.ORISO?node-id=105-11334',
                },
                {
                    name: 'Chat-type card states',
                    type: 'figma',
                    url: 'https://www.figma.com/design/QfsgojtHQzBjbzU3Im9Cet/Admin.ORISO?node-id=105-11674',
                },
            ],
        },
    },
    args: {
        tenantId: 'tenant-1',
        isLoading: false,
        excludeCardKeys: [],
        formStateKey: 'story',
        restrictedFields: new Set<string>(),
        onToggleUpdate: fn(),
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

/** Tenant admin view: every modality is on, all sub-toggles editable.
 *  Sub-toggles disable when their card master is switched off. */
export const TenantView: Story = {
    args: {
        initialValues: { settings: filledSettings },
    },
};

/** Live-chat module switched off: its sub-toggles (video, audio, voice, …)
 *  are locked off while the master is off — "disable, don't hide". */
export const LiveChatMasterOff: Story = {
    args: {
        initialValues: {
            settings: { ...filledSettings, featureAnonymousChatEnabled: false },
        },
    },
};

/** Platform admin has forced video calls off for the whole tenant. Every
 *  video sub-toggle across all cards is locked off and cannot be re-enabled
 *  by the tenant admin. */
export const PlatformForcedVideoOff: Story = {
    args: {
        restrictedFields: getForcedOffFields({ videoCalls: false } as never),
        initialValues: {
            settings: {
                ...filledSettings,
                featureVideoCallsEnabled: false,
                featureVideoCallsAnonymousChatsEnabled: false,
                featureVideoCallsOneOnOneChatsEnabled: false,
                featureVideoCallsGroupChatsEnabled: false,
                featureVideoCallsSupervisionChatsEnabled: false,
            },
        },
    },
};

/** Super-admin (platform) view with every chat-type master enabled. */
export const SuperAdminView: Story = {
    args: {
        initialValues: { settings: filledSettings },
    },
};

/** Platform view with the 1:1 master off: children remain visible but non-interactive until the
 *  master is enabled again, matching tenant and agency behavior. */
export const SuperAdminMasterOff: Story = {
    args: {
        policyLevel: 'platform',
        permissionPolicies: {
            featureCallsEnabled: { value: false, mode: 'SUGGESTED' },
        },
        initialValues: { settings: { ...filledSettings, featureCallsEnabled: false } },
    },
};

/** Each visible feature carries its own value and inheritance mode; no global enforcement mode. */
export const PerFeaturePolicies: Story = {
    args: {
        policyLevel: 'platform',
        permissionPolicies: {
            featureCallsEnabled: { value: true, mode: 'ENFORCED' },
            featureVideoCallsOneOnOneChatsEnabled: { value: false, mode: 'ENFORCED' },
            featureAudioCallsOneOnOneChatsEnabled: { value: true, mode: 'SUGGESTED' },
            featureVoiceMessagesOneOnOneChatsEnabled: { value: false, mode: 'SUGGESTED' },
        },
        initialValues: { settings: filledSettings },
    },
};
