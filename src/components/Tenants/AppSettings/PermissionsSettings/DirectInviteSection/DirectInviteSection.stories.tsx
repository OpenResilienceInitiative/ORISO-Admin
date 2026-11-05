import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState, type ComponentProps } from 'react';
import { DirectInviteSection } from './index';
import { PermissionsStoryFrame } from '../PermissionsStoryFrame';
import type { PolicyValue } from '../../../../../types/permissionPolicy';

// Buttons write their decision back, so the story reacts to clicks like the real page.
const ControlledDirectInviteSection = (args: ComponentProps<typeof DirectInviteSection>) => {
    const [changes, setChanges] = useState<Record<string, PolicyValue<boolean>>>({});
    return (
        <DirectInviteSection
            {...args}
            permissionPolicies={{ ...args.permissionPolicies, ...changes }}
            onPolicyChange={(field, policy) => setChanges((current) => ({ ...current, [field]: policy }))}
        />
    );
};

const policies = (
    chat: PolicyValue<boolean>,
    audio: PolicyValue<boolean>,
    video: PolicyValue<boolean>,
): Record<string, PolicyValue<boolean>> => ({
    featureDirectInviteChatEnabled: chat,
    featureDirectInviteAudioEnabled: audio,
    featureDirectInviteVideoEnabled: video,
});

const allowed: PolicyValue<boolean> = { value: true, mode: 'SUGGESTED', inherited: true };

/**
 * **ORISO-Admin#1242** — "Direkteinladung erlauben" per chat type.
 *
 * The platform can force it on or off; otherwise the Träger decides, and a Beratungsstelle can
 * only restrict what its Träger allows. Values here are mocked in the shape of
 * ORISO-TenantService#332 (`permissionPolicies`) and ORISO-AgencyService#347 (centre `settings`).
 */
const meta = {
    title: 'Tenants/Permissions/DirectInviteSection',
    component: DirectInviteSection,
    render: (args) => <ControlledDirectInviteSection {...args} />,
    tags: ['autodocs'],
    parameters: { layout: 'padded' },
    decorators: [
        (Story) => (
            <PermissionsStoryFrame wide>
                <Story />
            </PermissionsStoryFrame>
        ),
    ],
    args: {
        restrictedFields: new Set<string>(),
        policyLevel: 'platform',
        permissionPolicies: policies(
            { value: true, mode: 'SUGGESTED' },
            { value: true, mode: 'SUGGESTED' },
            { value: true, mode: 'SUGGESTED' },
        ),
    },
} satisfies Meta<typeof DirectInviteSection>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Platform default: all three allowed, every Träger may decide for itself. */
export const PlatformDefault: Story = {};

/** Platform forces video off and chat on: no Träger can change either. */
export const PlatformForced: Story = {
    args: {
        permissionPolicies: policies(
            { value: true, mode: 'ENFORCED' },
            { value: true, mode: 'SUGGESTED' },
            { value: false, mode: 'ENFORCED' },
        ),
    },
};

/** Träger page, nothing changed: every row follows the platform; video is locked by the platform. */
export const TraegerInherited: Story = {
    args: {
        policyLevel: 'tenant',
        permissionPolicies: policies(allowed, allowed, { value: false, mode: 'ENFORCED', inherited: true }),
    },
};

/** Träger page, the Träger switched audio off itself (own value, not inherited). */
export const TraegerOverridden: Story = {
    args: {
        policyLevel: 'tenant',
        permissionPolicies: policies(allowed, { value: false, mode: 'SUGGESTED', inherited: false }, allowed),
    },
};

/** Beratungsstelle page, nothing stored for the centre: it follows its Träger (audio off there). */
export const BeratungsstelleInherited: Story = {
    args: {
        policyLevel: 'agency',
        permissionPolicies: undefined,
        fallbackValues: {},
        traegerPolicies: policies(allowed, { value: false, mode: 'SUGGESTED', inherited: false }, allowed),
    },
};

/** Beratungsstelle page, the centre switched chat off for itself; video stays as the Träger allows. */
export const BeratungsstelleOverridden: Story = {
    args: {
        policyLevel: 'agency',
        permissionPolicies: undefined,
        fallbackValues: { featureDirectInviteChatEnabled: false },
        traegerPolicies: policies(allowed, allowed, allowed),
    },
};

/** Beratungsstelle page, the Träger made video a requirement: the centre cannot switch it off. */
export const BeratungsstelleEnforcedByTraeger: Story = {
    args: {
        policyLevel: 'agency',
        permissionPolicies: undefined,
        fallbackValues: {},
        traegerPolicies: policies(allowed, allowed, { value: true, mode: 'ENFORCED', inherited: false }),
    },
};

/** Beratungsstelle page, the Träger policies could not be read (e.g. 403): no editable defaults. */
export const BeratungsstelleTraegerUnavailable: Story = {
    args: {
        policyLevel: 'agency',
        permissionPolicies: undefined,
        traegerPoliciesStatus: 'error',
    },
};
