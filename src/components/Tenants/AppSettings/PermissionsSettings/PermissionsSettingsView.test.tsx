import { render, screen, within } from '@testing-library/react';
import type { ComponentProps } from 'react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { PermissionsSettingsView } from './PermissionsSettingsView';

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
const renderOneOnOne = (
    onPolicyChange = vi.fn(),
    props: Partial<ComponentProps<typeof PermissionsSettingsView>> = {},
) => {
    render(
        <PermissionsSettingsView
            tenantId="t1"
            excludeCardKeys={['liveChat', 'group', 'groupInternal']}
            isLoading={false}
            initialValues={{
                settings: {
                    featureCallsEnabled: true,
                    featureVideoCallsOneOnOneChatsEnabled: false,
                },
            }}
            formStateKey="k1"
            restrictedFields={new Set()}
            onToggleUpdate={vi.fn()}
            permissionPolicies={{
                featureCallsEnabled: { value: true, mode: 'SUGGESTED' },
                featureVideoCallsOneOnOneChatsEnabled: { value: false, mode: 'SUGGESTED' },
            }}
            onPolicyChange={onPolicyChange}
            {...props}
        />,
    );
    return onPolicyChange;
};

describe('PermissionsSettingsView per-feature policy controls', () => {
    it('orders the title before the activated control, with the explanation behind the help button', () => {
        renderOneOnOne();

        const title = screen.getByRole('heading', { name: 'tenants.permissions.card.oneOnOne.title' });
        const activated = screen.getByRole('button', {
            name: /tenants.permissions.card.activated: tenants.permissions.policy.activated/,
        });

        expect(screen.getAllByRole('button', { name: /tileHelp\.open/ }).length).toBeGreaterThan(0);
        expect(title.compareDocumentPosition(activated)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    });

    it('shows policy buttons instead of the former global enforcement UI', () => {
        renderOneOnOne();

        expect(
            screen.getByRole('button', {
                name: /tenants.permissions.card.activated: tenants.permissions.policy.activated/,
            }),
        ).toBeTruthy();
        expect(
            screen.getByRole('button', {
                name: /tenants.permissions.feature.videoCalls: tenants.permissions.policy.deactivated/,
            }),
        ).toBeTruthy();
        expect(screen.queryByRole('switch')).toBeNull();
        expect(screen.queryByRole('checkbox')).toBeNull();
    });

    it('auto-reports the exact feature and the decision of each of its two buttons', async () => {
        const user = userEvent.setup();
        const onPolicyChange = renderOneOnOne();
        const video = document.querySelector(
            '[data-feature-policy="featureVideoCallsOneOnOneChatsEnabled"]',
        ) as HTMLElement;

        await user.click(
            within(video).getByRole('button', {
                name: /tenants.permissions.feature.videoCalls: tenants.permissions.policy.deactivated/,
            }),
        );
        expect(onPolicyChange).toHaveBeenLastCalledWith('featureVideoCallsOneOnOneChatsEnabled', {
            value: true,
            mode: 'SUGGESTED',
        });

        await user.click(within(video).getByRole('button', { name: /policy.makeRequired/ }));
        expect(onPolicyChange).toHaveBeenLastCalledWith('featureVideoCallsOneOnOneChatsEnabled', {
            value: false,
            mode: 'ENFORCED',
        });
        // No popup menu any more: nothing but the buttons themselves reacts.
        expect(document.querySelector('[data-admin-fab-menu-stack]')).toBeNull();
        expect(screen.queryByRole('menu')).toBeNull();
    });

    it('requires an already active feature with a single click on the lock', async () => {
        const user = userEvent.setup();
        const onPolicyChange = renderOneOnOne(vi.fn(), {
            permissionPolicies: {
                featureCallsEnabled: { value: true, mode: 'SUGGESTED' },
                featureVideoCallsOneOnOneChatsEnabled: { value: true, mode: 'SUGGESTED' },
            },
        });
        const video = document.querySelector(
            '[data-feature-policy="featureVideoCallsOneOnOneChatsEnabled"]',
        ) as HTMLElement;

        await user.click(within(video).getByRole('button', { name: /policy.makeRequired/ }));
        expect(onPolicyChange).toHaveBeenCalledTimes(1);
        expect(onPolicyChange).toHaveBeenCalledWith('featureVideoCallsOneOnOneChatsEnabled', {
            value: true,
            mode: 'ENFORCED',
        });
    });

    it('keeps form state synchronized across agency-style autosaves and master shutdown', async () => {
        const user = userEvent.setup();
        const onToggleUpdate = vi.fn();
        render(
            <PermissionsSettingsView
                tenantId="agency-55"
                excludeCardKeys={['liveChat', 'group', 'groupInternal']}
                isLoading={false}
                initialValues={{
                    settings: {
                        featureCallsEnabled: true,
                        featureVideoCallsOneOnOneChatsEnabled: true,
                        featureAudioCallsOneOnOneChatsEnabled: true,
                    },
                }}
                formStateKey="agency"
                restrictedFields={new Set()}
                onToggleUpdate={onToggleUpdate}
                policyLevel="agency"
            />,
        );

        const video = document.querySelector(
            '[data-feature-policy="featureVideoCallsOneOnOneChatsEnabled"]',
        ) as HTMLElement;
        // A Beratungsstelle only switches; it has no lock for a requirement.
        expect(within(video).queryByRole('button', { name: /makeRequired|makeAdjustable/ })).toBeNull();
        await user.click(within(video).getByRole('button', { name: /policy.activated – / }));

        const audio = document.querySelector(
            '[data-feature-policy="featureAudioCallsOneOnOneChatsEnabled"]',
        ) as HTMLElement;
        await user.click(within(audio).getByRole('button', { name: /policy.activated – / }));

        expect(onToggleUpdate.mock.calls[1][2]).toMatchObject({
            settings: {
                featureVideoCallsOneOnOneChatsEnabled: false,
                featureAudioCallsOneOnOneChatsEnabled: false,
            },
        });

        const master = document.querySelector('[data-feature-policy="featureCallsEnabled"]') as HTMLElement;
        await user.click(within(master).getByRole('button', { name: /policy.activated – / }));
        expect(onToggleUpdate.mock.calls[2][2]).toMatchObject({
            settings: {
                featureCallsEnabled: false,
                featureVideoCallsOneOnOneChatsEnabled: false,
                featureAudioCallsOneOnOneChatsEnabled: false,
            },
        });
    });

    it('shows inherited enforcement as a disabled button, with no menu, lock or dialog', async () => {
        const user = userEvent.setup();
        render(
            <PermissionsSettingsView
                tenantId="t1"
                excludeCardKeys={['liveChat', 'group', 'groupInternal']}
                isLoading={false}
                initialValues={{ settings: { featureCallsEnabled: true } }}
                formStateKey="k2"
                restrictedFields={new Set(['featureCallsEnabled'])}
                onToggleUpdate={vi.fn()}
                permissionPolicies={{
                    featureCallsEnabled: { value: true, mode: 'ENFORCED', inherited: true },
                }}
            />,
        );

        const inherited = screen.getByRole('button', {
            name: /tenants.permissions.card.activated: tenants.permissions.policy.activated$/,
        });
        expect(inherited).toBeDisabled();
        await user.click(inherited);
        expect(screen.queryByRole('dialog')).toBeNull();
        expect(document.querySelector('[data-admin-fab-menu-stack]')).toBeNull();
        const master = document.querySelector('[data-feature-policy="featureCallsEnabled"]') as HTMLElement;
        expect(within(master).queryByRole('button', { name: /makeRequired|makeAdjustable/ })).toBeNull();
    });

    // ORISO-TenantService#363: the Träger's stored "off" is shown, not the platform's suggestion.
    // Caritas Berlin case: raw false + inherited suggestion on = never chose -> ON, "suggested".
    it.each([
        [{ value: false, mode: 'SUGGESTED', inherited: false }, true, 'deactivated', 'own'],
        [{ value: true, mode: 'SUGGESTED', inherited: true }, false, 'activated', 'suggested'],
        [undefined, false, 'deactivated', 'own'],
    ] as const)('policy %o with raw %s shows %s with source %s', (videoPolicy, own, state, source) => {
        renderOneOnOne(vi.fn(), {
            permissionPolicies: {
                featureCallsEnabled: { value: true, mode: 'SUGGESTED' },
                ...(videoPolicy ? { featureVideoCallsOneOnOneChatsEnabled: videoPolicy } : {}),
            },
            ownSettings: { featureVideoCallsOneOnOneChatsEnabled: own },
        });
        const control = document.querySelector(
            '[data-feature-policy="featureVideoCallsOneOnOneChatsEnabled"]',
        ) as HTMLElement;
        expect(
            within(control).getByRole('button', { name: new RegExp(`tenants.permissions.policy.${state}`) }),
        ).toBeInTheDocument();
        expect(within(control).getByText(`tenants.permissions.policy.source.${source}`)).toBeInTheDocument();
    });

    it('uses false form values when an asker policy is absent from a partial response', () => {
        render(
            <PermissionsSettingsView
                tenantId="t1"
                excludeCardKeys={['liveChat', 'group', 'groupInternal']}
                isLoading={false}
                initialValues={{
                    settings: {
                        featureDisplayNameEditable: false,
                        featureAskerEmailEnabled: false,
                    },
                }}
                formStateKey="partial-asker"
                restrictedFields={new Set()}
                onToggleUpdate={vi.fn()}
                permissionPolicies={{}}
            />,
        );

        expect(
            screen.getByRole('button', {
                name: /tenants.permissions.asker.displayName.label: tenants.permissions.policy.deactivated/,
            }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', {
                name: /tenants.permissions.asker.email.label: tenants.permissions.policy.deactivated/,
            }),
        ).toBeInTheDocument();
    });

    it('locks only a pending policy control', () => {
        renderOneOnOne(vi.fn(), {
            pendingPolicyFields: new Set(['featureVideoCallsOneOnOneChatsEnabled']),
        });

        const video = document.querySelector(
            '[data-feature-policy="featureVideoCallsOneOnOneChatsEnabled"]',
        ) as HTMLElement;
        within(video)
            .getAllByRole('button')
            .forEach((button) => expect(button).toBeDisabled());
        expect(
            screen.getByRole('button', {
                name: /tenants.permissions.card.activated: tenants.permissions.policy.activated – /,
            }),
        ).toBeEnabled();
    });
});

// Review 4300331824: a failed or pending Träger read must not pass defaults off as the Träger's values.
describe('PermissionsSettingsView tiles', () => {
    it('gives every tile a header icon', () => {
        renderOneOnOne();

        // The page's own wrapper card shares the heading level but is not a tile.
        const tiles = screen
            .getAllByRole('heading', { level: 5 })
            .filter((heading) => heading.textContent !== 'tenants.permissions.title');
        expect(tiles.map((heading) => heading.textContent)).toContain('tenants.permissions.asker.title');
        expect(tiles.length).toBeGreaterThan(1);
        tiles.forEach((heading) => {
            expect(heading.parentElement?.querySelector('[class*="headerIcon"]')).toBeTruthy();
        });
        expect(screen.getAllByRole('button', { name: /tileHelp\.open/ })).toHaveLength(tiles.length);
    });

    it('shows direct invitations inside the one-on-one tile, independent of its master switch', () => {
        renderOneOnOne(vi.fn(), {
            initialValues: { settings: { featureCallsEnabled: false } },
            permissionPolicies: { featureCallsEnabled: { value: false, mode: 'SUGGESTED' } },
        });

        const tile = screen.getByTestId('chat-type-card-oneOnOne');
        const chat = tile.querySelector('[data-feature-policy="featureDirectInviteChatEnabled"]') as HTMLElement;
        expect(chat).toBeTruthy();
        // Round button and lock both stay usable while the tile's own master is off.
        within(chat)
            .getAllByRole('button')
            .forEach((button) => expect(button).toBeEnabled());
    });
});

describe('PermissionsSettingsView Träger channel switches', () => {
    const renderCentre = (traegerChannelPoliciesStatus: 'pending' | 'error' | 'success') =>
        renderOneOnOne(vi.fn(), {
            channelsSetOnTraeger: true,
            traegerChannelPolicies: undefined,
            traegerChannelPoliciesStatus,
        });
    const emailChannel = () =>
        document.querySelector('[data-feature-policy="featureAskerEmailAgencyCounsellingEnabled"]');

    it('says the Träger values could not be loaded instead of showing defaults', () => {
        renderCentre('error');

        expect(screen.getByText('tenants.permissions.card.notifications.traegerUnavailable')).toBeInTheDocument();
        expect(emailChannel()).toBeNull();
        expect(screen.queryByTestId('traeger-channels-loading')).toBeNull();
    });

    it('shows a loading state while the Träger values are read', () => {
        renderCentre('pending');

        expect(screen.getByTestId('traeger-channels-loading')).toBeInTheDocument();
        expect(emailChannel()).toBeNull();
        expect(screen.queryByText('tenants.permissions.card.notifications.traegerUnavailable')).toBeNull();
    });

    it('shows the read-only channel switches once the Träger values are loaded', () => {
        renderCentre('success');

        expect(emailChannel()).not.toBeNull();
    });
});
