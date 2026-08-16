import { render, screen } from '@testing-library/react';
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

const renderOneOnOne = (onPolicyChange = vi.fn()) => {
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
            onSave={vi.fn()}
            permissionPolicies={{
                featureCallsEnabled: { value: true, mode: 'SUGGESTED' },
                featureVideoCallsOneOnOneChatsEnabled: { value: false, mode: 'SUGGESTED' },
            }}
            onPolicyChange={onPolicyChange}
        />,
    );
    return onPolicyChange;
};

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

        await user.click(
            screen.getByRole('button', {
                name: /tenants.permissions.card.activated: tenants.permissions.policy.openMenu/,
            }),
        );
        expect(document.querySelectorAll('[data-admin-fab-menu-stack]')).toHaveLength(1);

        await user.click(
            screen.getByRole('button', {
                name: /tenants.permissions.feature.videoCalls: tenants.permissions.policy.openMenu/,
            }),
        );
        expect(document.querySelectorAll('[data-admin-fab-menu-stack]')).toHaveLength(1);
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
                onSave={vi.fn()}
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
                onSave={vi.fn()}
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
});
