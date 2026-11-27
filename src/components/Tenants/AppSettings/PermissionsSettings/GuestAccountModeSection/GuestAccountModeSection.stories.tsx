import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState, type ComponentProps } from 'react';
import { GuestAccountModeSection } from './index';
import { PermissionsStoryFrame } from '../PermissionsStoryFrame';
import type { PolicyValue } from '../../../../../types/permissionPolicy';

// Buttons write their decision back, so the story reacts to clicks like the real page.
const ControlledGuestAccountModeSection = (args: ComponentProps<typeof GuestAccountModeSection>) => {
    const [changes, setChanges] = useState<Record<string, PolicyValue<boolean>>>({});
    return (
        <GuestAccountModeSection
            {...args}
            permissionPolicies={{ ...args.permissionPolicies, ...changes }}
            onPolicyChange={(field, policy) => setChanges((current) => ({ ...current, [field]: policy }))}
        />
    );
};

const allowed: PolicyValue<boolean> = { value: true, mode: 'SUGGESTED', inherited: true };

/**
 * **ORISO-UserService#1662** — "Gastkonten erlauben": which guest account modes a counsellor may
 * offer on a direct link or call link, per chat type ("nach der Sitzung löschen", "Gast wählt",
 * "dauerhaft"). The platform can force a mode on or off; otherwise the Träger decides. Values are
 * mocked in the shape of ORISO-TenantService `permissionPolicies`
 * (`featureGuestAccount<Mode><Medium>Enabled`).
 */
const meta = {
    title: 'Settings/Einstellungen/Funktionszugriff/GuestAccountModeSection',
    id: 'tenants-permissions-guestaccountmodesection',
    component: GuestAccountModeSection,
    render: (args) => <ControlledGuestAccountModeSection {...args} />,
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
        policyLevel: 'tenant',
        permissionPolicies: {},
    },
} satisfies Meta<typeof GuestAccountModeSection>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Träger page, nothing changed: every mode allowed for every chat type. */
export const TraegerDefault: Story = {};

/** Träger page: no permanent guest accounts for video calls, no "delete after" for chats. */
export const TraegerRestricted: Story = {
    args: {
        permissionPolicies: {
            featureGuestAccountPermanentVideoEnabled: { value: false, mode: 'SUGGESTED', inherited: false },
            featureGuestAccountTemporaryChatEnabled: { value: false, mode: 'SUGGESTED', inherited: false },
            featureGuestAccountGuestChoosesChatEnabled: allowed,
        },
    },
};

/** Träger page: the platform forbids temporary accounts for audio calls; the row is locked. */
export const PlatformEnforcedOnTraeger: Story = {
    args: {
        permissionPolicies: {
            featureGuestAccountTemporaryAudioEnabled: { value: false, mode: 'ENFORCED', inherited: true },
        },
    },
};

/** Platform page: a mode can be made a requirement for every Träger with the lock. */
export const Platform: Story = {
    args: {
        policyLevel: 'platform',
        permissionPolicies: {
            featureGuestAccountTemporaryAudioEnabled: { value: false, mode: 'ENFORCED' },
        },
    },
};

/** A chat type with no mode left: the page says guests then get a permanent account. */
export const NoModeAllowed: Story = {
    args: {
        permissionPolicies: {
            featureGuestAccountTemporaryAudioEnabled: { value: false, mode: 'SUGGESTED', inherited: false },
            featureGuestAccountGuestChoosesAudioEnabled: { value: false, mode: 'SUGGESTED', inherited: false },
            featureGuestAccountPermanentAudioEnabled: { value: false, mode: 'SUGGESTED', inherited: false },
        },
    },
};
