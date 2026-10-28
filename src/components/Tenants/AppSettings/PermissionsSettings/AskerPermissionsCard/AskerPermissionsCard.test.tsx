import { render, screen } from '@testing-library/react';
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
        expect(screen.getAllByText('tenants.permissions.policy.suggestion')).toHaveLength(2);
        expect(screen.getAllByText('tenants.permissions.card.notifications.setOnTraeger')).toHaveLength(2);
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
