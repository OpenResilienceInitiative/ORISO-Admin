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

const wrapperOf = (scope: HTMLElement, field: string) => {
    const wrapper = scope.querySelector<HTMLElement>(`[data-feature-policy="${field}"]`);
    expect(wrapper, `control for ${field}`).not.toBeNull();
    return wrapper as HTMLElement;
};
/** The round on/off button of one setting. */
const control = (scope: HTMLElement, field: string) =>
    within(wrapperOf(scope, field)).getByRole('button', { name: /tenants.permissions.policy.(activated|deactivated)/ });
/** The requirement lock of one setting; absent where the level or state does not allow it. */
const lock = (scope: HTMLElement, field: string) =>
    within(wrapperOf(scope, field)).getByRole('button', {
        name: /tenants.permissions.policy.(makeRequired|makeAdjustable)/,
    });
const lockOrNull = (scope: HTMLElement, field: string) =>
    within(wrapperOf(scope, field)).queryByRole('button', {
        name: /tenants.permissions.policy.(makeRequired|makeAdjustable)/,
    });

const TILES = [
    ['oneOnOne', 'featureAskerEmailAgencyCounsellingEnabled', 'featureAskerBrowserAgencyCounsellingEnabled'],
    ['group', 'featureAskerEmailSelfHelpEnabled', 'featureAskerBrowserSelfHelpEnabled'],
] as const;

const NAME_TILES = [
    ['oneOnOne', 'featureDisplayNameEditableAgencyCounsellingEnabled'],
    ['liveChat', 'featureDisplayNameEditableLiveChatEnabled'],
    ['group', 'featureDisplayNameEditableSelfHelpEnabled'],
] as const;

describe('login and display name permissions per conversation type', () => {
    it.each(NAME_TILES)('%s writes its own value and inheritance mode', async (tile, field) => {
        const user = userEvent.setup();
        const onPolicyChange = vi.fn();
        const { rerender } = render(
            <PermissionsSettingsView
                {...baseProps({
                    onPolicyChange,
                    permissionPolicies: { [field]: { value: false, mode: 'SUGGESTED' } },
                })}
            />,
        );
        const card = screen.getByTestId(`chat-type-card-${tile}`);
        await user.click(control(card, field));
        expect(onPolicyChange).toHaveBeenLastCalledWith(field, { value: true, mode: 'SUGGESTED' });

        rerender(
            <PermissionsSettingsView
                {...baseProps({
                    onPolicyChange,
                    permissionPolicies: { [field]: { value: true, mode: 'SUGGESTED' } },
                })}
            />,
        );
        await user.click(lock(card, field));
        expect(onPolicyChange).toHaveBeenLastCalledWith(field, { value: true, mode: 'ENFORCED' });
    });

    it('shows the Träger values as read-only, including an adjustable choice', () => {
        render(
            <PermissionsSettingsView
                {...baseProps({
                    policyLevel: 'agency',
                    channelsSetOnTraeger: true,
                    traegerChannelPolicies: {
                        [NAME_TILES[0][1]]: { value: false, mode: 'SUGGESTED', inherited: true },
                        [NAME_TILES[1][1]]: { value: true, mode: 'ENFORCED', inherited: true },
                        [NAME_TILES[2][1]]: { value: false, mode: 'ENFORCED', inherited: true },
                    },
                })}
            />,
        );

        NAME_TILES.forEach(([tile, field]) => {
            const card = screen.getByTestId(`chat-type-card-${tile}`);
            expect(control(card, field)).toBeDisabled();
            expect(control(card, field)).toHaveAttribute('aria-pressed', String(tile === 'liveChat'));
            expect(lockOrNull(card, field)).toBeNull();
        });
        expect(
            screen
                .getByTestId('chat-type-card-groupInternal')
                .querySelector('[data-feature-policy^="featureDisplayNameEditable"]'),
        ).toBeNull();
    });

    it('keeps each choice visible without letting it bypass the account-wide restriction', () => {
        render(
            <PermissionsSettingsView
                {...baseProps({
                    permissionPolicies: {
                        featureDisplayNameEditable: { value: false, mode: 'ENFORCED', inherited: true },
                        [NAME_TILES[0][1]]: { value: true, mode: 'SUGGESTED' },
                    },
                })}
            />,
        );
        const card = screen.getByTestId('chat-type-card-oneOnOne');

        expect(control(card, NAME_TILES[0][1])).toHaveAttribute('aria-pressed', 'true');
        expect(control(card, NAME_TILES[0][1])).toBeDisabled();
        expect(within(card).getByText('tenants.permissions.asker.displayName.masterOff')).toBeVisible();
    });
});

const INTERNAL_EMAIL = 'featureConsultantEmailInternalGroupEnabled';
const INTERNAL_BROWSER = 'featureConsultantBrowserInternalGroupEnabled';

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

            const policiesFor = (policy: PolicyValue<boolean>) => ({
                permissionPolicies: { [email]: policy, [browser]: policy },
            });

            // Switching on and requiring are two clicks, each one its own write; the saved value
            // of the first click is what the page shows when the second one happens.
            const switchOnThenRequire = async (field: string) => {
                expect(control(card(), field)).toHaveAccessibleName(/policy.deactivated/);
                expect(control(card(), field)).toHaveAttribute('aria-pressed', 'false');
                await user.click(control(card(), field));
                expect(onPolicyChange).toHaveBeenLastCalledWith(field, { value: true, mode: 'SUGGESTED' });
            };
            await switchOnThenRequire(email);
            await switchOnThenRequire(browser);

            const switchedOn: PolicyValue<boolean> = { value: true, mode: 'SUGGESTED' };
            rerender(<PermissionsSettingsView {...baseProps({ onPolicyChange, ...policiesFor(switchedOn) })} />);
            await user.click(lock(card(), email));
            expect(onPolicyChange).toHaveBeenLastCalledWith(email, { value: true, mode: 'ENFORCED' });
            await user.click(lock(card(), browser));
            expect(onPolicyChange).toHaveBeenLastCalledWith(browser, { value: true, mode: 'ENFORCED' });

            const saved: PolicyValue<boolean> = { value: true, mode: 'ENFORCED' };
            rerender(<PermissionsSettingsView {...baseProps({ onPolicyChange, ...policiesFor(saved) })} />);
            [email, browser].forEach((field) => {
                expect(control(card(), field)).toHaveAccessibleName(/policy.activated/);
                expect(control(card(), field)).toHaveAttribute('aria-pressed', 'true');
                expect(lock(card(), field)).toHaveAccessibleName(/policy.enforced – .*makeAdjustable/);
                expect(lock(card(), field)).toHaveAttribute('aria-pressed', 'true');
            });
        },
    );

    it('shows the live-chat links on the live-chat tile only', () => {
        render(<PermissionsSettingsView {...baseProps({ liveChatLinks: <div>links-slot</div> })} />);

        expect(within(screen.getByTestId('chat-type-card-liveChat')).getByText('links-slot')).toBeTruthy();
        expect(screen.getAllByText('links-slot')).toHaveLength(1);
        // Above the switches, so the links never end up at the bottom of a long tile.
        const tile = screen.getByTestId('chat-type-card-liveChat').innerHTML;
        expect(tile.indexOf('links-slot')).toBeLessThan(tile.indexOf('featureAskerBrowserLiveChatEnabled'));
    });

    // Frank 2026-11-03: live chat stays temporary and anonymous, so it has no e-mail to ask for or send.
    it('offers no e-mail switch on the live-chat tile', () => {
        render(<PermissionsSettingsView {...baseProps()} />);

        const liveChat = screen.getByTestId('chat-type-card-liveChat');
        expect(liveChat.querySelector('[data-feature-policy*="AskerEmail"]')).toBeNull();
        expect(liveChat.querySelector('[data-feature-policy="featureAskerBrowserLiveChatEnabled"]')).toBeTruthy();
    });

    it.each([
        ['oneOnOne', 'featureAskerEmailCollectionAgencyCounsellingEnabled'],
        ['group', 'featureAskerEmailCollectionSelfHelpEnabled'],
    ])('%s tile decides itself whether the chat asks for an address', (tile, field) => {
        render(<PermissionsSettingsView {...baseProps()} />);

        expect(control(screen.getByTestId(`chat-type-card-${tile}`), field)).toBeEnabled();
    });

    it('locks the question on a tile while the account forbids an address', () => {
        render(
            <PermissionsSettingsView
                {...baseProps({
                    permissionPolicies: { featureAskerEmailEnabled: { value: false, mode: 'SUGGESTED' } },
                })}
            />,
        );

        const tile = screen.getByTestId('chat-type-card-oneOnOne');
        expect(control(tile, 'featureAskerEmailCollectionAgencyCounsellingEnabled')).toBeDisabled();
        expect(within(tile).getByText('tenants.permissions.asker.collection.masterOff')).toBeTruthy();
    });

    it('says the question has no effect while the e-mail notification is off', () => {
        render(
            <PermissionsSettingsView
                {...baseProps({
                    permissionPolicies: { featureAskerEmailSelfHelpEnabled: { value: false, mode: 'SUGGESTED' } },
                })}
            />,
        );

        const tile = screen.getByTestId('chat-type-card-group');
        expect(control(tile, 'featureAskerEmailCollectionSelfHelpEnabled')).toBeEnabled();
        expect(within(tile).getByText('tenants.permissions.card.notifications.askNeedsDelivery')).toBeTruthy();
    });

    it('advice-seeker card no longer repeats the switches of tiles on the page', () => {
        render(<PermissionsSettingsView {...baseProps()} />);

        expect(screen.queryByRole('heading', { name: 'tenants.permissions.asker.channels.title' })).toBeNull();
        expect(document.querySelectorAll('[data-feature-policy="featureAskerEmailSelfHelpEnabled"]')).toHaveLength(1);
    });

    it('keeps the switches of a hidden tile reachable on the advice-seeker card', async () => {
        const user = userEvent.setup();
        const onPolicyChange = vi.fn();
        render(<PermissionsSettingsView {...baseProps({ onPolicyChange, excludeCardKeys: ['liveChat'] })} />);

        expect(screen.getByRole('heading', { name: 'tenants.permissions.asker.channels.title' })).toBeTruthy();
        const browser = screen.getByRole('button', {
            name: 'tenants.permissions.asker.channels.browserLiveChat: tenants.permissions.policy.activated – tenants.permissions.policy.deactivate',
        });
        await user.click(browser);
        expect(onPolicyChange).toHaveBeenLastCalledWith('featureAskerBrowserLiveChatEnabled', {
            value: false,
            mode: 'SUGGESTED',
        });
        expect(
            document.querySelectorAll('[data-feature-policy="featureAskerEmailAgencyCounsellingEnabled"]'),
        ).toHaveLength(1);
    });

    it('internal group chats tile: email switch is live, browser switch is not effective yet', async () => {
        const user = userEvent.setup();
        const onPolicyChange = vi.fn();
        render(<PermissionsSettingsView {...baseProps({ onPolicyChange })} />);
        const card = screen.getByTestId('chat-type-card-groupInternal');

        expect(within(card).getByText('tenants.permissions.card.notifications.consultantTitle')).toBeTruthy();
        expect(control(card, INTERNAL_EMAIL)).toBeEnabled();
        await user.click(control(card, INTERNAL_EMAIL));
        expect(onPolicyChange).toHaveBeenLastCalledWith(INTERNAL_EMAIL, { value: false, mode: 'SUGGESTED' });

        // Open product question: no browser producer for group members yet (FE#1725 T7).
        expect(control(card, INTERNAL_BROWSER)).toBeDisabled();
        const browser = card.querySelector<HTMLElement>(`[data-feature-policy="${INTERNAL_BROWSER}"]`) as HTMLElement;
        expect(within(browser).getByText('tenants.permissions.card.notifications.notYetEffective')).toBeTruthy();
        // 54509df4 / Admin#991: supervision stays under "Other functions", never on this tile.
        expect(card.querySelector('[data-feature-policy*="Supervision"]')).toBeNull();
    });

    // Review 10: AgencyService does not store channel switches, so a centre cannot change them.
    it('centre page shows the Träger channel values read-only with a note where they are set', () => {
        const onPolicyChange = vi.fn();
        render(
            <PermissionsSettingsView
                {...baseProps({
                    onPolicyChange,
                    policyLevel: 'agency',
                    channelsSetOnTraeger: true,
                    traegerChannelPolicies: {
                        featureAskerEmailSelfHelpEnabled: { value: true, mode: 'ENFORCED' },
                        [INTERNAL_EMAIL]: { value: false, mode: 'SUGGESTED' },
                    },
                })}
            />,
        );

        const group = screen.getByTestId('chat-type-card-group');
        expect(control(group, 'featureAskerEmailSelfHelpEnabled')).toBeDisabled();
        expect(control(group, 'featureAskerEmailSelfHelpEnabled')).toHaveAccessibleName(/policy.activated$/);
        // A Beratungsstelle never sets a requirement: no lock next to the Träger value.
        expect(lockOrNull(group, 'featureAskerEmailSelfHelpEnabled')).toBeNull();
        expect(control(group, 'featureAskerBrowserSelfHelpEnabled')).toBeDisabled();
        expect(within(group).getByText('tenants.permissions.card.notifications.setOnTraeger')).toBeTruthy();

        const internal = screen.getByTestId('chat-type-card-groupInternal');
        expect(control(internal, INTERNAL_EMAIL)).toBeDisabled();
        expect(control(internal, INTERNAL_EMAIL)).toHaveAccessibleName(/policy.deactivated$/);
        expect(onPolicyChange).not.toHaveBeenCalled();
    });
});
