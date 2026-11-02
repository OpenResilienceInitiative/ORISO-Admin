import type { Meta, StoryObj } from '@storybook/react';
import { useState, type ComponentProps } from 'react';
// eslint-disable-next-line import/no-unresolved -- exports-map subpath resolves for tsc/Vite
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import i18n from '../../../../../i18n';
import { AskerPermissionsCard } from './index';
import { PermissionsStoryFrame } from '../PermissionsStoryFrame';

const ControlledAskerPermissionsCard = (args: ComponentProps<typeof AskerPermissionsCard>) => {
    const [openPolicyMenu, setOpenPolicyMenu] = useState<string | null>(null);
    return <AskerPermissionsCard {...args} openPolicyMenu={openPolicyMenu} onOpenPolicyMenu={setOpenPolicyMenu} />;
};

/**
 * **ORISO-Admin#602** — the first card under Einstellungen/Berechtigungen.
 *
 * These two settings govern the advice seeker's **own account**, which is why they come before the
 * per-chat-type feature cards rather than sitting among them.
 *
 * Two things to check in every story:
 *
 * - **The word "Nutzername" appears nowhere.** Switch 1 governs the *Anzeigename*
 *   (`displayName`). The *Anmeldename* (`userName`) is a different, immutable thing, and an admin
 *   who reads "Nutzername" would believe they are deciding about the login credential. A test
 *   asserts the word is absent.
 * - **Disable, never hide.** A setting the platform has not permitted renders as a *disabled*
 *   switch, so a Träger admin can see the choice exists and who holds it.
 */
const meta = {
    title: 'Tenants/Permissions/AskerPermissionsCard',
    component: AskerPermissionsCard,
    render: (args) => <ControlledAskerPermissionsCard {...args} />,
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
        permissionPolicies: {
            featureDisplayNameEditable: { value: true, mode: 'SUGGESTED' },
            featureAskerEmailEnabled: { value: true, mode: 'SUGGESTED' },
        },
    },
} satisfies Meta<typeof AskerPermissionsCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Both permissions granted — the default for every tenant, since both settings are opt-out. */
export const BothEnabled: Story = {};

/**
 * **The U25 configuration.** Free name entry off and no e-mail invitation. Note what the e-mail
 * description then has to say: without an address there is no way back into a forgotten account,
 * which makes credential saving the only remaining safeguard rather than a nice-to-have.
 */
export const U25Configuration: Story = {
    args: {
        permissionPolicies: {
            featureDisplayNameEditable: { value: false, mode: 'SUGGESTED' },
            featureAskerEmailEnabled: { value: false, mode: 'SUGGESTED' },
        },
    },
};

/**
 * **Enforce mode** — an upper role locking these two settings for the roles below.
 * Without the asker settings in the enforcement contract they would be the only
 * permissions on the page that could not be locked, which is a hole in the model
 * rather than a deliberate exemption.
 */
export const PerFeatureEnforcement: Story = {
    args: {
        policyLevel: 'platform',
        permissionPolicies: {
            featureDisplayNameEditable: { value: true, mode: 'SUGGESTED' },
            featureAskerEmailEnabled: { value: true, mode: 'ENFORCED' },
        },
    },
};

/** Free name entry withheld, e-mail still offered. */
export const DisplayNameLocked: Story = {
    args: {
        permissionPolicies: {
            featureDisplayNameEditable: { value: false, mode: 'ENFORCED', inherited: true },
            featureAskerEmailEnabled: { value: true, mode: 'SUGGESTED' },
        },
    },
};

/**
 * **Restricted by the platform.** The e-mail switch is disabled rather than absent — the house
 * rule is *disable, never hide*, so the Träger admin can see that the decision exists and that
 * somebody above them holds it.
 */
export const RestrictedByPlatform: Story = {
    args: {
        restrictedFields: new Set(['featureAskerEmailEnabled']),
        permissionPolicies: {
            featureDisplayNameEditable: { value: true, mode: 'SUGGESTED' },
            featureAskerEmailEnabled: { value: false, mode: 'ENFORCED', inherited: true },
        },
    },
};

/** The display-name policy is locked while its autosave request is in flight. */
export const PendingAutosave: Story = {
    args: {
        pendingPolicyFields: new Set(['featureDisplayNameEditable']),
    },
};

const collectionFields = [
    'featureAskerEmailCollectionAgencyCounsellingEnabled',
    'featureAskerEmailCollectionLiveChatEnabled',
    'featureAskerEmailCollectionSelfHelpEnabled',
] as const;
const mixedCollectionPolicies: NonNullable<ComponentProps<typeof AskerPermissionsCard>['permissionPolicies']> = {
    featureAskerEmailEnabled: { value: true, mode: 'SUGGESTED' },
    [collectionFields[0]]: { value: true, mode: 'SUGGESTED' },
    [collectionFields[1]]: { value: false, mode: 'ENFORCED' },
    [collectionFields[2]]: { value: true, mode: 'ENFORCED' },
};

/** Collection and notification delivery are independent. Mixed type choices stay stored. */
export const CollectionMixedPreferences: Story = {
    args: { permissionPolicies: mixedCollectionPolicies },
};

export const CollectionGlobalMasterOff: Story = {
    args: {
        policyLevel: 'platform',
        permissionPolicies: {
            ...mixedCollectionPolicies,
            featureAskerEmailEnabled: { value: false, mode: 'SUGGESTED' },
        },
        onPolicyChange: fn(),
    },
    play: async ({ canvasElement, args }) => {
        await Promise.all(
            collectionFields.map(async (field) => {
                const row = canvasElement.querySelector<HTMLElement>(`[data-feature-policy="${field}"]`)!;
                await expect(within(row).getByRole('button')).toBeDisabled();
                await userEvent.click(within(row).getByRole('button'));
            }),
        );
        await expect(args.onPolicyChange).not.toHaveBeenCalled();
    },
};

/** Recommendations remain truthful at Agency, where these account permissions are not editable. */
export const AgencyCollectionReadOnly: Story = {
    args: {
        policyLevel: 'agency',
        permissionPolicies: {
            featureAskerEmailEnabled: { value: true, mode: 'SUGGESTED', inherited: true },
            [collectionFields[0]]: { value: true, mode: 'SUGGESTED', inherited: true },
            [collectionFields[1]]: { value: false, mode: 'SUGGESTED', inherited: true },
            [collectionFields[2]]: { value: true, mode: 'SUGGESTED', inherited: true },
        },
        onPolicyChange: fn(),
    },
    play: async ({ canvasElement, args }) => {
        await Promise.all(
            collectionFields.map(async (field) => {
                const row = canvasElement.querySelector<HTMLElement>(`[data-feature-policy="${field}"]`)!;
                await expect(within(row).getByRole('button')).toBeDisabled();
                await expect(
                    within(row).getByText(String(i18n.t('tenants.permissions.card.notifications.setOnTraeger'))),
                ).toBeVisible();
            }),
        );
        await expect(args.onPolicyChange).not.toHaveBeenCalled();
    },
};

const EditableCollectionCard = (args: ComponentProps<typeof AskerPermissionsCard>) => {
    const [permissionPolicies, setPermissionPolicies] = useState(args.permissionPolicies);
    return (
        <ControlledAskerPermissionsCard
            {...args}
            permissionPolicies={permissionPolicies}
            onPolicyChange={(field, next) => {
                setPermissionPolicies((current) => ({ ...current, [field]: next }));
                args.onPolicyChange?.(field, next);
            }}
        />
    );
};

export const CollectionFourStateMenus: Story = {
    args: { policyLevel: 'platform', permissionPolicies: mixedCollectionPolicies, onPolicyChange: fn() },
    render: (args) => <EditableCollectionCard {...args} />,
    play: async ({ canvasElement, args }) => {
        const page = within(canvasElement.ownerDocument.body);
        const actions = ['activationEnforced', 'deactivationEnforced', 'activationSuggested', 'deactivationSuggested'];
        await collectionFields.reduce(async (previousField, field) => {
            await previousField;
            const row = canvasElement.querySelector<HTMLElement>(`[data-feature-policy="${field}"]`)!;
            await actions.reduce(async (previousAction, action) => {
                await previousAction;
                await userEvent.click(within(row).getByRole('button'));
                await userEvent.click(
                    page.getByRole('button', { name: i18n.t(`tenants.permissions.policy.${action}`) }),
                );
                await waitFor(() =>
                    expect(within(row).getByRole('button')).toHaveAccessibleName(
                        expect.stringContaining(i18n.t(`tenants.permissions.policy.${action}`)),
                    ),
                );
            }, Promise.resolve());
        }, Promise.resolve());
        await expect(args.onPolicyChange).toHaveBeenCalledTimes(12);
    },
};
