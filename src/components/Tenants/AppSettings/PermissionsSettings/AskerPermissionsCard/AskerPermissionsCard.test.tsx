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

const P = 'tenants.permissions.policy';
const NAME = 'tenants.permissions.asker.displayName.label';
const EMAIL = 'tenants.permissions.asker.email.label';
const round = (label: string, state: 'activated' | 'deactivated', action?: 'activate' | 'deactivate') =>
    action ? `${label}: ${P}.${state} – ${P}.${action}` : `${label}: ${P}.${state}`;
const lock = (label: string, mode: 'suggestion' | 'enforced', action: 'makeRequired' | 'makeAdjustable') =>
    `${label}: ${P}.${mode} – ${P}.${action}`;

describe('AskerPermissionsCard per-feature policies', () => {
    it('renders both account features as independent policy controls', () => {
        renderCard();

        expect(screen.getByRole('button', { name: round(NAME, 'deactivated', 'activate') })).toBeTruthy();
        expect(screen.getByRole('button', { name: lock(NAME, 'suggestion', 'makeRequired') })).toBeTruthy();
        expect(screen.getByRole('button', { name: round(EMAIL, 'activated', 'deactivate') })).toBeTruthy();
        expect(screen.getByRole('button', { name: lock(EMAIL, 'enforced', 'makeAdjustable') })).toBeTruthy();
        expect(screen.queryByRole('checkbox')).toBeNull();
        expect(screen.queryByRole('switch')).toBeNull();
    });

    it('reports each decision of one feature separately and leaves the other feature alone', async () => {
        const user = userEvent.setup();
        const onPolicyChange = vi.fn();
        renderCard({ onPolicyChange });

        await user.click(screen.getByRole('button', { name: round(NAME, 'deactivated', 'activate') }));
        expect(onPolicyChange).toHaveBeenLastCalledWith('featureDisplayNameEditable', {
            value: true,
            mode: 'SUGGESTED',
        });
        await user.click(screen.getByRole('button', { name: lock(EMAIL, 'enforced', 'makeAdjustable') }));
        expect(onPolicyChange).toHaveBeenLastCalledWith('featureAskerEmailEnabled', {
            value: true,
            mode: 'SUGGESTED',
        });
        expect(onPolicyChange).toHaveBeenCalledTimes(2);
    });

    it('shows agency account recommendations read-only without changing their values or modes', async () => {
        const user = userEvent.setup();
        const onPolicyChange = vi.fn();
        renderCard({
            policyLevel: 'agency',
            permissionPolicies: {
                featureDisplayNameEditable: { value: false, mode: 'SUGGESTED', inherited: true },
                featureAskerEmailEnabled: { value: true, mode: 'SUGGESTED', inherited: true },
            },
            onPolicyChange,
        });

        const name = screen.getByRole('button', { name: round(NAME, 'deactivated') });
        const email = screen.getByRole('button', { name: round(EMAIL, 'activated') });
        expect(name).toBeDisabled();
        expect(email).toBeDisabled();
        // Beratungsstellen never set a requirement, so neither feature has a lock.
        expect(screen.queryByRole('button', { name: /makeRequired|makeAdjustable/ })).toBeNull();
        expect(screen.getAllByText(`${P}.suggestion`)).toHaveLength(2);
        expect(screen.getAllByText('tenants.permissions.card.notifications.setOnTraeger')).toHaveLength(2);
        await user.click(name);
        await user.click(email);
        expect(onPolicyChange).not.toHaveBeenCalled();
    });

    it('shows an inherited enforced feature read-only: disabled button, no lock, no dialog', async () => {
        const user = userEvent.setup();
        const onPolicyChange = vi.fn();
        renderCard({
            policyLevel: 'tenant',
            permissionPolicies: {
                featureDisplayNameEditable: { value: true, mode: 'ENFORCED', inherited: true },
                featureAskerEmailEnabled: { value: true, mode: 'SUGGESTED' },
            },
            onPolicyChange,
        });

        const inherited = screen.getByRole('button', { name: round(NAME, 'activated') });
        expect(inherited).toBeDisabled();
        expect(
            screen.queryByRole('button', { name: new RegExp(`^${NAME}:.*(makeRequired|makeAdjustable)`) }),
        ).toBeNull();
        await user.click(inherited);
        expect(screen.queryByRole('dialog')).toBeNull();
        expect(onPolicyChange).not.toHaveBeenCalled();
        // The sibling feature stays editable.
        expect(screen.getByRole('button', { name: round(EMAIL, 'activated', 'deactivate') })).toBeEnabled();
    });

    it('keeps restricted features visible and explains who owns the enforced decision', () => {
        renderCard({ restrictedFields: new Set(['featureAskerEmailEnabled']) });

        expect(screen.getByText(EMAIL)).toBeTruthy();
        expect(screen.getByText('tenants.permissions.asker.restrictedReason')).toBeTruthy();
    });

    it('locks only the feature whose autosave is pending', async () => {
        const user = userEvent.setup();
        const onPolicyChange = vi.fn();
        renderCard({
            pendingPolicyFields: new Set(['featureDisplayNameEditable']),
            onPolicyChange,
        });

        const pendingRound = screen.getByRole('button', { name: round(NAME, 'deactivated') });
        const pendingLock = screen.getByRole('button', { name: lock(NAME, 'suggestion', 'makeRequired') });
        expect(pendingRound).toBeDisabled();
        expect(pendingLock).toBeDisabled();
        await user.click(pendingRound);
        await user.click(pendingLock);
        expect(onPolicyChange).not.toHaveBeenCalled();
        expect(screen.getByRole('button', { name: round(EMAIL, 'activated', 'deactivate') })).toBeEnabled();
        expect(screen.getByRole('button', { name: lock(EMAIL, 'enforced', 'makeAdjustable') })).toBeEnabled();
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
    ['tenants.permissions.asker.channels.emailLiveChat', 'tenants.permissions.asker.channels.browserLiveChat'].forEach(
        (label) => {
            expect(screen.getByRole('button', { name: new RegExp(`^${label}: ${P}.(de)?activated – `) })).toBeTruthy();
            expect(screen.getByRole('button', { name: new RegExp(`^${label}: ${P}.suggestion – `) })).toBeTruthy();
        },
    );
});
