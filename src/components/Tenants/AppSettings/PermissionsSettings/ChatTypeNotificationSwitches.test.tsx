import { render, screen, within } from '@testing-library/react';
import type { ComponentProps } from 'react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PermissionsSettingsView } from './PermissionsSettingsView';
import type { PolicyValue } from '../../../../types/permissionPolicy';

// FE#1725 stories 38–39: notification switches live on each conversation-type tile.

beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, 'scrollTo', { configurable: true, value: vi.fn() });
});

vi.mock('react-i18next', () => {
    const t = (key?: string) => key ?? '';
    return {
        useTranslation: () => Object.assign([t, { language: 'de' }, true], { t, i18n: { language: 'de' } }),
        Trans: ({ i18nKey }: { i18nKey?: string }) => i18nKey ?? null,
        initReactI18next: { type: '3rdParty', init: () => undefined },
    };
});

vi.mock('./CaseHandoverCard', () => ({ CaseHandoverCard: () => null }));
vi.mock('../../../../resources/img/svg/permissions/one_on_one.svg', () => ({ ReactComponent: () => null }));
vi.mock('../../../../resources/img/svg/permissions/live_chat.svg', () => ({ ReactComponent: () => null }));
vi.mock('../../../../resources/img/svg/permissions/group.svg', () => ({ ReactComponent: () => null }));
vi.mock('../../../../resources/img/svg/permissions/group_internal.svg', () => ({ ReactComponent: () => null }));
vi.mock('../../../../resources/img/svg/i.svg', () => ({ ReactComponent: () => null }));

type ViewProps = ComponentProps<typeof PermissionsSettingsView>;

const baseProps = (props: Partial<ViewProps> = {}): ViewProps => ({
    tenantId: 't1',
    isLoading: false,
    initialValues: { settings: {} },
    formStateKey: 'k1',
    restrictedFields: new Set(),
    onToggleUpdate: vi.fn(),
    onPolicyChange: vi.fn(),
    ...props,
});

const control = (scope: HTMLElement, field: string) => {
    const wrapper = scope.querySelector<HTMLElement>(`[data-feature-policy="${field}"]`);
    expect(wrapper, `control for ${field}`).not.toBeNull();
    return within(wrapper as HTMLElement).getByRole('button', { name: /tenants.permissions.policy.openMenu/ });
};

const TILES = [
    ['oneOnOne', 'featureAskerEmailAgencyCounsellingEnabled', 'featureAskerBrowserAgencyCounsellingEnabled'],
    ['liveChat', 'featureAskerEmailLiveChatEnabled', 'featureAskerBrowserLiveChatEnabled'],
    ['group', 'featureAskerEmailSelfHelpEnabled', 'featureAskerBrowserSelfHelpEnabled'],
    ['groupInternal', 'featureConsultantEmailInternalGroupEnabled', 'featureConsultantBrowserInternalGroupEnabled'],
] as const;

describe('notification switches on conversation-type tiles', () => {
    it.each(TILES)(
        '%s tile saves its email and browser switch and shows the saved value',
        async (tile, email, browser) => {
            const user = userEvent.setup();
            const onPolicyChange = vi.fn();
            const off: PolicyValue<boolean> = { value: false, mode: 'SUGGESTED' };
            const { rerender } = render(
                <PermissionsSettingsView
                    {...baseProps({ onPolicyChange, permissionPolicies: { [email]: off, [browser]: off } })}
                />,
            );
            const card = () => screen.getByTestId(`chat-type-card-${tile}`);

            const switchOn = async (field: string) => {
                expect(control(card(), field)).toHaveAccessibleName(/deactivationSuggested/);
                await user.click(control(card(), field));
                await user.click(screen.getByRole('button', { name: 'tenants.permissions.policy.activationEnforced' }));
                expect(onPolicyChange).toHaveBeenLastCalledWith(field, { value: true, mode: 'ENFORCED' });
            };
            await switchOn(email);
            await switchOn(browser);

            const saved: PolicyValue<boolean> = { value: true, mode: 'ENFORCED' };
            rerender(
                <PermissionsSettingsView
                    {...baseProps({ onPolicyChange, permissionPolicies: { [email]: saved, [browser]: saved } })}
                />,
            );
            expect(control(card(), email)).toHaveAccessibleName(/activationEnforced/);
            expect(control(card(), browser)).toHaveAccessibleName(/activationEnforced/);
        },
    );

    it('advice-seeker card no longer repeats the switches of tiles on the page', () => {
        render(<PermissionsSettingsView {...baseProps()} />);

        expect(screen.queryByRole('heading', { name: 'tenants.permissions.asker.channels.title' })).toBeNull();
        expect(document.querySelectorAll('[data-feature-policy="featureAskerEmailLiveChatEnabled"]')).toHaveLength(1);
    });

    it('keeps the switches of a hidden tile reachable on the advice-seeker card', async () => {
        const user = userEvent.setup();
        const onPolicyChange = vi.fn();
        render(<PermissionsSettingsView {...baseProps({ onPolicyChange, excludeCardKeys: ['liveChat'] })} />);

        expect(screen.getByRole('heading', { name: 'tenants.permissions.asker.channels.title' })).toBeTruthy();
        // Live-chat email defaults off (TenantService default false).
        const email = screen.getByRole('button', {
            name: /tenants.permissions.asker.channels.emailLiveChat: tenants.permissions.policy.openMenu – tenants.permissions.policy.deactivationSuggested/,
        });
        await user.click(email);
        await user.click(screen.getByRole('button', { name: 'tenants.permissions.policy.activationSuggested' }));
        expect(onPolicyChange).toHaveBeenLastCalledWith('featureAskerEmailLiveChatEnabled', {
            value: true,
            mode: 'SUGGESTED',
        });
        expect(
            document.querySelectorAll('[data-feature-policy="featureAskerEmailAgencyCounsellingEnabled"]'),
        ).toHaveLength(1);
    });

    it('internal group chats tile offers counsellor email and browser switches', () => {
        render(<PermissionsSettingsView {...baseProps()} />);
        const card = screen.getByTestId('chat-type-card-groupInternal');

        expect(within(card).getByText('tenants.permissions.card.notifications.consultantTitle')).toBeTruthy();
        ['featureConsultantEmailInternalGroupEnabled', 'featureConsultantBrowserInternalGroupEnabled'].forEach(
            (field) => {
                const trigger = control(card, field);
                // FE#1725 T7: TenantService knows the keys (default on), so they are savable.
                expect(trigger).toBeEnabled();
                expect(trigger).toHaveAccessibleName(/activationSuggested/);
            },
        );
        // 54509df4 / Admin#991: supervision stays under "Other functions", never on this tile.
        expect(card.querySelector('[data-feature-policy*="Supervision"]')).toBeNull();
    });
});
