import { render, screen, within } from '@testing-library/react';
import type { ComponentProps, SVGProps } from 'react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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
vi.mock('../../../../resources/img/svg/i.svg', () => ({
    ReactComponent: (props: SVGProps<SVGSVGElement>) => <svg data-testid="permission-description-info" {...props} />,
}));

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

describe('PermissionsSettingsView data parity (1-on-1 card)', () => {
    // ORISO-Admin#809 refined the card hierarchy: the description carries a leading
    // neutral info icon, and title -> description -> activated control read in that
    // order. The refinement still applies. Only the control it points at changed:
    // the demo line replaced the activated switch with a policy menu button, so the
    // ordering is asserted against that button instead of a role='switch'.
    it('orders the title, leading description info, and activated control for quick scanning', () => {
        renderOneOnOne();

        const title = screen.getByRole('heading', { name: 'tenants.permissions.card.oneOnOne.title' });
        const description = screen.getByText('tenants.permissions.card.oneOnOne.description').closest('p');
        const descriptionInfo = screen.getByTestId('permission-description-info');
        const activated = screen.getByRole('button', {
            name: /tenants.permissions.card.activated: tenants.permissions.policy.openMenu/,
        });

        expect(description).not.toBeNull();
        expect(description?.firstElementChild).toBe(descriptionInfo);
        expect(descriptionInfo).toHaveAttribute('aria-hidden', 'true');
        expect(title.compareDocumentPosition(description as Node)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
        expect((description as Node).compareDocumentPosition(activated)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    });
});

describe('PermissionsSettingsView per-feature policy controls', () => {
    it('shows policy buttons instead of the former global enforcement UI', () => {
        renderOneOnOne();

        expect(
            screen.getByRole('button', {
                name: /tenants.permissions.card.activated: tenants.permissions.policy.openMenu/,
            }),
        ).toBeTruthy();
        expect(
            screen.getByRole('button', {
                name: /tenants.permissions.feature.videoCalls: tenants.permissions.policy.openMenu/,
            }),
        ).toBeTruthy();
        expect(screen.queryByRole('switch')).toBeNull();
        expect(screen.queryByRole('checkbox')).toBeNull();
    });

    it('keeps at most one feature menu open', async () => {
        const user = userEvent.setup();
        renderOneOnOne();

        const masterTrigger = screen.getByRole('button', {
            name: /tenants.permissions.card.activated: tenants.permissions.policy.openMenu/,
        });
        const videoTrigger = screen.getByRole('button', {
            name: /tenants.permissions.feature.videoCalls: tenants.permissions.policy.openMenu/,
        });
        await user.click(masterTrigger);
        expect(document.querySelectorAll('[data-admin-fab-menu-stack]')).toHaveLength(1);
        expect(masterTrigger).toHaveAttribute('aria-expanded', 'true');

        await user.click(videoTrigger);
        expect(document.querySelectorAll('[data-admin-fab-menu-stack]')).toHaveLength(1);
        expect(masterTrigger).toHaveAttribute('aria-expanded', 'false');
        expect(videoTrigger).toHaveAttribute('aria-expanded', 'true');
    });

    it('auto-reports the exact feature and selected policy', async () => {
        const user = userEvent.setup();
        const onPolicyChange = renderOneOnOne();

        await user.click(
            screen.getByRole('button', {
                name: /tenants.permissions.feature.videoCalls: tenants.permissions.policy.openMenu/,
            }),
        );
        await user.click(screen.getByRole('button', { name: 'tenants.permissions.policy.activationEnforced' }));

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
        await user.click(within(video).getByRole('button', { name: /openMenu/ }));
        await user.click(within(video).getByRole('button', { name: /deactivationSuggested/ }));

        const audio = document.querySelector(
            '[data-feature-policy="featureAudioCallsOneOnOneChatsEnabled"]',
        ) as HTMLElement;
        await user.click(within(audio).getByRole('button', { name: /openMenu/ }));
        await user.click(within(audio).getByRole('button', { name: /deactivationSuggested/ }));

        expect(onToggleUpdate.mock.calls[1][2]).toMatchObject({
            settings: {
                featureVideoCallsOneOnOneChatsEnabled: false,
                featureAudioCallsOneOnOneChatsEnabled: false,
            },
        });

        const master = document.querySelector('[data-feature-policy="featureCallsEnabled"]') as HTMLElement;
        await user.click(within(master).getByRole('button', { name: /openMenu/ }));
        await user.click(within(master).getByRole('button', { name: /deactivationSuggested/ }));
        expect(onToggleUpdate.mock.calls[2][2]).toMatchObject({
            settings: {
                featureCallsEnabled: false,
                featureVideoCallsOneOnOneChatsEnabled: false,
                featureAudioCallsOneOnOneChatsEnabled: false,
            },
        });
    });

    it('opens the information dialog rather than a menu for inherited enforcement', async () => {
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

        await user.click(
            screen.getByRole('button', {
                name: /tenants.permissions.card.activated: tenants.permissions.policy.moreInformation/,
            }),
        );
        expect(screen.getByRole('dialog')).toBeTruthy();
        expect(document.querySelector('[data-admin-fab-menu-stack]')).toBeNull();
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
                name: /tenants.permissions.asker.displayName.label:.*tenants.permissions.policy.deactivationSuggested/,
            }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', {
                name: /tenants.permissions.asker.email.label:.*tenants.permissions.policy.deactivationSuggested/,
            }),
        ).toBeInTheDocument();
    });

    it('locks only a pending policy control', () => {
        renderOneOnOne(vi.fn(), {
            pendingPolicyFields: new Set(['featureVideoCallsOneOnOneChatsEnabled']),
        });

        expect(
            screen.getByRole('button', {
                name: /tenants.permissions.feature.videoCalls: tenants.permissions.policy.openMenu/,
            }),
        ).toBeDisabled();
        expect(
            screen.getByRole('button', {
                name: /tenants.permissions.card.activated: tenants.permissions.policy.openMenu/,
            }),
        ).toBeEnabled();
    });
});
