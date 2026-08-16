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

    it('limits an agency suggestion menu to activate, deactivate and information', async () => {
        const user = userEvent.setup();
        const onPolicyChange = vi.fn();
        renderCard({
            policyLevel: 'agency',
            openPolicyMenu: 'featureDisplayNameEditable',
            onOpenPolicyMenu: vi.fn(),
            onPolicyChange,
        });

        expect(screen.queryByText('tenants.permissions.policy.activationEnforced')).toBeNull();
        expect(screen.getByText('tenants.permissions.policy.moreInformation')).toBeTruthy();
        await user.click(screen.getByRole('button', { name: 'tenants.permissions.policy.activationSuggested' }));
        expect(onPolicyChange).toHaveBeenCalledWith('featureDisplayNameEditable', {
            value: true,
            mode: 'SUGGESTED',
        });
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
});
