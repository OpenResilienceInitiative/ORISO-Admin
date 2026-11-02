import { useState } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AskerPermissionsCard } from './index';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'de' } }),
    Trans: ({ i18nKey }: { i18nKey: string }) => <span>{i18nKey}</span>,
}));

const renderCard = (props: Partial<React.ComponentProps<typeof AskerPermissionsCard>> = {}) =>
    render(
        <AskerPermissionsCard
            restrictedFields={new Set()}
            permissionPolicies={{
                featureDisplayNameEditable: { value: false, mode: 'SUGGESTED' },
                featureAskerEmailEnabled: { value: true, mode: 'ENFORCED' },
            }}
            {...props}
        />,
    );

describe('AskerPermissionsCard per-feature policies', () => {
    it('renders both account features as independent policy controls', () => {
        renderCard();

        expect(
            screen.getByRole('button', {
                name: /tenants.permissions.asker.displayName.label: tenants.permissions.policy.openMenu/,
            }),
        ).toBeTruthy();
        expect(
            screen.getByRole('button', {
                name: /tenants.permissions.asker.email.label: tenants.permissions.policy.openMenu/,
            }),
        ).toBeTruthy();
        expect(screen.queryByRole('checkbox')).toBeNull();
        expect(screen.queryByRole('switch')).toBeNull();
    });

    it('shows agency account recommendations read-only without changing their values or modes', async () => {
        const user = userEvent.setup();
        const onPolicyChange = vi.fn();
        const onOpenPolicyMenu = vi.fn();
        renderCard({
            policyLevel: 'agency',
            permissionPolicies: {
                featureDisplayNameEditable: { value: false, mode: 'SUGGESTED', inherited: true },
                featureAskerEmailEnabled: { value: true, mode: 'SUGGESTED', inherited: true },
            },
            openPolicyMenu: 'featureDisplayNameEditable',
            onOpenPolicyMenu,
            onPolicyChange,
        });

        const name = screen.getByRole('button', {
            name: /tenants.permissions.asker.displayName.label:.*deactivationSuggested/,
        });
        const email = screen.getByRole('button', {
            name: /tenants.permissions.asker.email.label:.*activationSuggested/,
        });
        expect(name).toBeDisabled();
        expect(email).toBeDisabled();
        expect(screen.getAllByText('tenants.permissions.policy.suggestion')).toHaveLength(5);
        expect(screen.getAllByText('tenants.permissions.card.notifications.setOnTraeger')).toHaveLength(5);
        expect(screen.queryByRole('button', { name: 'tenants.permissions.policy.activationSuggested' })).toBeNull();
        await user.click(name);
        await user.click(email);
        expect(onOpenPolicyMenu).not.toHaveBeenCalled();
        expect(onPolicyChange).not.toHaveBeenCalled();
    });

    it('opens information directly for an inherited enforced feature', async () => {
        const user = userEvent.setup();
        renderCard({
            policyLevel: 'tenant',
            permissionPolicies: {
                featureDisplayNameEditable: { value: true, mode: 'ENFORCED', inherited: true },
                featureAskerEmailEnabled: { value: true, mode: 'SUGGESTED' },
            },
        });

        await user.click(
            screen.getByRole('button', {
                name: /tenants.permissions.asker.displayName.label: tenants.permissions.policy.moreInformation/,
            }),
        );
        expect(screen.getByRole('dialog')).toBeTruthy();
        expect(screen.queryByText('tenants.permissions.policy.activationEnforced')).toBeNull();
    });

    it('keeps restricted features visible and explains who owns the enforced decision', () => {
        renderCard({ restrictedFields: new Set(['featureAskerEmailEnabled']) });

        expect(screen.getByText('tenants.permissions.asker.email.label')).toBeTruthy();
        expect(screen.getByText('tenants.permissions.asker.restrictedReason')).toBeTruthy();
    });

    it('locks only the feature whose autosave is pending', async () => {
        const user = userEvent.setup();
        const onOpenPolicyMenu = vi.fn();
        const onPolicyChange = vi.fn();
        renderCard({
            pendingPolicyFields: new Set(['featureDisplayNameEditable']),
            onOpenPolicyMenu,
            onPolicyChange,
        });

        const pendingButton = screen.getByRole('button', {
            name: /tenants.permissions.asker.displayName.label: tenants.permissions.policy.openMenu/,
        });
        expect(pendingButton).toBeDisabled();
        await user.click(pendingButton);
        expect(onOpenPolicyMenu).not.toHaveBeenCalled();
        expect(onPolicyChange).not.toHaveBeenCalled();
        expect(
            screen.getByRole('button', {
                name: /tenants.permissions.asker.email.label: tenants.permissions.policy.openMenu/,
            }),
        ).toBeEnabled();
    });
});

it('shows no channel block when every conversation-type tile carries its own switches', () => {
    renderCard();
    expect(screen.queryByRole('heading', { name: 'tenants.permissions.asker.channels.title' })).toBeNull();
    expect(screen.queryByRole('button', { name: /tenants.permissions.asker.channels/ })).toBeNull();
});

it('offers independent email and browser policies for a hidden live-chat tile', () => {
    renderCard({
        channelToggles: [
            {
                field: 'featureAskerEmailLiveChatEnabled',
                labelKey: 'tenants.permissions.asker.channels.emailLiveChat',
                defaultValue: false,
            },
            {
                field: 'featureAskerBrowserLiveChatEnabled',
                labelKey: 'tenants.permissions.asker.channels.browserLiveChat',
            },
        ],
    });
    expect(
        screen.getByRole('button', {
            name: /tenants.permissions.asker.channels.emailLiveChat: tenants.permissions.policy.openMenu/,
        }),
    ).toBeTruthy();
    expect(
        screen.getByRole('button', {
            name: /tenants.permissions.asker.channels.browserLiveChat: tenants.permissions.policy.openMenu/,
        }),
    ).toBeTruthy();
});

const collectionFields = [
    'featureAskerEmailCollectionAgencyCounsellingEnabled',
    'featureAskerEmailCollectionLiveChatEnabled',
    'featureAskerEmailCollectionSelfHelpEnabled',
] as const;

const collectionRow = (field: string) => {
    const row = document.querySelector<HTMLElement>(`[data-feature-policy="${field}"]`);
    if (!row) throw new Error(`Collection permission row is missing: ${field}`);
    return within(row);
};

const ControlledCard = ({ onOpenPolicyMenu, ...props }: Partial<React.ComponentProps<typeof AskerPermissionsCard>>) => {
    const [openPolicyMenu, setOpenPolicyMenu] = useState<string | null>(null);
    return (
        <AskerPermissionsCard
            restrictedFields={new Set()}
            {...props}
            openPolicyMenu={openPolicyMenu}
            onOpenPolicyMenu={(field) => {
                setOpenPolicyMenu(field);
                onOpenPolicyMenu?.(field);
            }}
        />
    );
};

const collectionStates = [
    { value: true, mode: 'ENFORCED', action: 'activationEnforced' },
    { value: false, mode: 'ENFORCED', action: 'deactivationEnforced' },
    { value: true, mode: 'SUGGESTED', action: 'activationSuggested' },
    { value: false, mode: 'SUGGESTED', action: 'deactivationSuggested' },
] as const;

describe.each(['platform', 'tenant'] as const)('%s email collection controls', (level) => {
    it.each(collectionFields.flatMap((field) => collectionStates.map((state) => ({ field, ...state }))))(
        'offers $field as $value / $mode without changing another permission',
        async ({ field, value, mode, action }) => {
            const onPolicyChange = vi.fn();
            render(
                <ControlledCard
                    policyLevel={level}
                    permissionPolicies={{
                        featureAskerEmailEnabled: { value: true, mode: 'SUGGESTED' },
                        [field]: { value: !value, mode: mode === 'ENFORCED' ? 'SUGGESTED' : 'ENFORCED' },
                    }}
                    onPolicyChange={onPolicyChange}
                />,
            );
            const user = userEvent.setup();
            await user.click(collectionRow(field).getByRole('button', { name: /openMenu/ }));
            await user.click(screen.getByRole('button', { name: `tenants.permissions.policy.${action}` }));
            expect(onPolicyChange).toHaveBeenCalledExactlyOnceWith(field, { value, mode });
            expect(document.querySelector('[data-feature-policy="featureAskerEmailLiveChatEnabled"]')).toBeNull();
        },
    );
});

it.each(collectionFields)('keeps inherited enforced %s information-only', async (field) => {
    const onPolicyChange = vi.fn();
    render(
        <ControlledCard
            permissionPolicies={{ [field]: { value: false, mode: 'ENFORCED', inherited: true } }}
            onPolicyChange={onPolicyChange}
        />,
    );
    await userEvent.setup().click(collectionRow(field).getByRole('button', { name: /moreInformation/ }));
    await waitFor(() => expect(screen.getByRole('dialog')).toBeVisible());
    expect(onPolicyChange).not.toHaveBeenCalled();
});

it.each(collectionFields.flatMap((field) => [false, true].map((value) => ({ field, value }))))(
    'keeps agency collection recommendation $field=$value truthful and read-only',
    async ({ field, value }) => {
        const onPolicyChange = vi.fn();
        render(
            <ControlledCard
                policyLevel="agency"
                permissionPolicies={{ [field]: { value, mode: 'SUGGESTED', inherited: true } }}
                onPolicyChange={onPolicyChange}
            />,
        );
        const row = collectionRow(field);
        const control = row.getByRole('button', { name: /openMenu/ });
        expect(control).toBeDisabled();
        expect(control).toHaveAccessibleName(
            expect.stringContaining(value ? 'activationSuggested' : 'deactivationSuggested'),
        );
        expect(row.getByText('tenants.permissions.card.notifications.setOnTraeger')).toBeVisible();
        await userEvent.setup().click(control);
        expect(onPolicyChange).not.toHaveBeenCalled();
    },
);

it('closes and guards an open child menu when global email turns OFF, without rewriting mixed choices', async () => {
    const onPolicyChange = vi.fn();
    const onOpenPolicyMenu = vi.fn();
    const mixed = {
        [collectionFields[0]]: { value: true, mode: 'SUGGESTED' as const },
        [collectionFields[1]]: { value: false, mode: 'ENFORCED' as const },
        [collectionFields[2]]: { value: true, mode: 'ENFORCED' as const },
    };
    const props = {
        policyLevel: 'platform' as const,
        onPolicyChange,
        onOpenPolicyMenu,
    };
    const view = render(
        <ControlledCard
            {...props}
            permissionPolicies={{ ...mixed, featureAskerEmailEnabled: { value: true, mode: 'SUGGESTED' } }}
        />,
    );
    const user = userEvent.setup();
    await user.click(collectionRow(collectionFields[0]).getByRole('button', { name: /openMenu/ }));
    expect(screen.getByRole('button', { name: 'tenants.permissions.policy.activationEnforced' })).toBeVisible();
    view.rerender(
        <ControlledCard
            {...props}
            permissionPolicies={{ ...mixed, featureAskerEmailEnabled: { value: false, mode: 'SUGGESTED' } }}
        />,
    );
    expect(
        screen.queryByRole('button', { name: 'tenants.permissions.policy.activationEnforced' }),
    ).not.toBeInTheDocument();
    expect(onOpenPolicyMenu).toHaveBeenLastCalledWith(null);
    await Promise.all(
        collectionFields.map(async (field) => {
            const button = collectionRow(field).getByRole('button', { name: /openMenu/ });
            expect(button).toBeDisabled();
            expect(collectionRow(field).getByText('tenants.permissions.asker.collection.masterOff')).toBeVisible();
            await user.click(button);
        }),
    );
    expect(onPolicyChange).not.toHaveBeenCalled();
    view.rerender(
        <ControlledCard
            {...props}
            permissionPolicies={{ ...mixed, featureAskerEmailEnabled: { value: true, mode: 'SUGGESTED' } }}
        />,
    );
    collectionFields.forEach((field) => {
        expect(collectionRow(field).getByRole('button', { name: /openMenu/ })).toBeEnabled();
        expect(collectionRow(field).getByTestId(mixed[field].value ? 'CheckIcon' : 'BlockIcon')).toBeVisible();
    });
    expect(
        screen.queryByRole('button', { name: 'tenants.permissions.policy.activationEnforced' }),
    ).not.toBeInTheDocument();
    expect(onPolicyChange).not.toHaveBeenCalled();
});

it('defaults all collection permissions ON without turning live-chat delivery ON', () => {
    renderCard({
        channelToggles: [{ field: 'featureAskerEmailLiveChatEnabled', labelKey: 'delivery', defaultValue: false }],
    });
    collectionFields.forEach((field) => expect(collectionRow(field).getByTestId('CheckIcon')).toBeVisible());
    expect(collectionRow('featureAskerEmailLiveChatEnabled').getByTestId('BlockIcon')).toBeVisible();
});

it('locks only the collection field whose save is pending', () => {
    renderCard({ pendingPolicyFields: new Set([collectionFields[1]]) });
    expect(collectionRow(collectionFields[0]).getByRole('button')).toBeEnabled();
    expect(collectionRow(collectionFields[1]).getByRole('button')).toBeDisabled();
    expect(collectionRow(collectionFields[2]).getByRole('button')).toBeEnabled();
});
