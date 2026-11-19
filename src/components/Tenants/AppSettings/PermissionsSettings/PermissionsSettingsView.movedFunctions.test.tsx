import { render, screen, waitFor, within } from '@testing-library/react';
import type { ComponentProps } from 'react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { PermissionsSettingsView } from './PermissionsSettingsView';
import type { PolicyValue } from '../../../../types/permissionPolicy';

/**
 * ORISO-Admin#1577 (Frank, 2026-11-19): what moved from the former Funktionalitäten tab into
 * Funktionszugriff, on every level: the supervision tile with its dialog, Team-Chat on the Mail
 * Beratung tile, and the two older switches the counselling app still reads, kept in step with the
 * tiles (group-chat umbrella, Träger call permission).
 */

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
type Level = 'platform' | 'tenant' | 'agency';

const SUPERVISION = 'featureSupervisionEnabled';
const SUPERVISION_VIDEO = 'featureVideoCallsSupervisionChatsEnabled';
const TEAM_CHAT = 'featureTeamDiscussionEnabled';
const CIRCLES = 'featureSelfHelpGroupsEnabled';
const INTERNAL = 'featureInternalGroupChatEnabled';
const UMBRELLA = 'featureGroupChatV2Enabled';

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

const wrapperOf = (field: string, scope: HTMLElement = document.body) => {
    const wrapper = scope.querySelector<HTMLElement>(`[data-feature-policy="${field}"]`);
    expect(wrapper, `control for ${field}`).not.toBeNull();
    return wrapper as HTMLElement;
};
const valueButton = (field: string, scope?: HTMLElement) =>
    within(wrapperOf(field, scope)).getByRole('button', { name: /tenants.permissions.policy.(activated|deactivated)/ });
const lockOrNull = (field: string, scope?: HTMLElement) =>
    within(wrapperOf(field, scope)).queryByRole('button', {
        name: /tenants.permissions.policy.(makeRequired|makeAdjustable)/,
    });

const policy = (value: boolean, mode: 'SUGGESTED' | 'ENFORCED' = 'SUGGESTED', inherited?: boolean) =>
    ({ value, mode, ...(inherited === undefined ? {} : { inherited }) } as PolicyValue<boolean>);

const supervisionTile = () => screen.getByTestId('supervision-tile');
const dialog = () => document.querySelector<HTMLElement>('[data-testid="supervision-dialog"]');

describe('Supervision tile', () => {
    it('comes after the four conversation types and names Mail Beratung and Live Chat', () => {
        render(<PermissionsSettingsView {...baseProps()} />);

        const tiles = [
            ...document.querySelectorAll('[data-testid^="chat-type-card-"], [data-testid="supervision-tile"]'),
        ];
        expect(tiles.map((tile) => tile.getAttribute('data-testid'))).toEqual([
            'chat-type-card-oneOnOne',
            'chat-type-card-liveChat',
            'chat-type-card-group',
            'chat-type-card-groupInternal',
            'supervision-tile',
        ]);
        expect(within(supervisionTile()).getByText('tenants.permissions.supervision.description')).toBeVisible();
        // The per-type switch stays on Mail Beratung and Live Chat only (Frank, 2026-11-19).
        ['oneOnOne', 'liveChat'].forEach((key) =>
            expect(
                screen
                    .getByTestId(`chat-type-card-${key}`)
                    .querySelector('[data-feature-policy^="featureSupervision"]'),
            ).not.toBeNull(),
        );
        ['group', 'groupInternal'].forEach((key) =>
            expect(
                screen
                    .getByTestId(`chat-type-card-${key}`)
                    .querySelector('[data-feature-policy^="featureSupervision"]'),
            ).toBeNull(),
        );
    });

    it('lists the supervision-chat features in a dialog, not inline', () => {
        render(<PermissionsSettingsView {...baseProps()} />);

        expect(supervisionTile().querySelector(`[data-feature-policy="${SUPERVISION_VIDEO}"]`)).toBeNull();
        expect(
            within(supervisionTile()).getByRole('button', { name: 'tenants.permissions.supervision.configure' }),
        ).toBeEnabled();
    });

    it('opens with the keyboard and saves only the changed features on "Speichern"', async () => {
        const user = userEvent.setup();
        const onPolicyChange = vi.fn();
        render(<PermissionsSettingsView {...baseProps({ onPolicyChange, policyLevel: 'tenant' })} />);

        within(supervisionTile()).getByRole('button', { name: 'tenants.permissions.supervision.configure' }).focus();
        await user.keyboard('{Enter}');
        await waitFor(() => expect(dialog()).not.toBeNull());
        valueButton(SUPERVISION_VIDEO, dialog() as HTMLElement).focus();
        await user.keyboard(' ');
        // A draft only: nothing is saved before "Speichern".
        expect(onPolicyChange).not.toHaveBeenCalled();
        within(document.body).getByRole('button', { name: 'tenants.permissions.supervision.save' }).focus();
        await user.keyboard('{Enter}');

        expect(onPolicyChange).toHaveBeenCalledTimes(1);
        expect(onPolicyChange).toHaveBeenCalledWith(SUPERVISION_VIDEO, {
            value: false,
            mode: 'SUGGESTED',
            inherited: false,
        });
    });

    it('discards the drafts on Escape', async () => {
        const user = userEvent.setup();
        const onPolicyChange = vi.fn();
        render(<PermissionsSettingsView {...baseProps({ onPolicyChange })} />);

        await user.click(
            within(supervisionTile()).getByRole('button', { name: 'tenants.permissions.supervision.configure' }),
        );
        await waitFor(() => expect(dialog()).not.toBeNull());
        await user.click(valueButton(SUPERVISION_VIDEO, dialog() as HTMLElement));
        expect(valueButton(SUPERVISION_VIDEO, dialog() as HTMLElement)).toHaveAccessibleName(/deactivated/);
        await user.keyboard('{Escape}');

        // Opened again, the dialog starts from the saved values: the draft is gone.
        await user.click(
            within(supervisionTile()).getByRole('button', { name: 'tenants.permissions.supervision.configure' }),
        );
        await waitFor(() =>
            expect(valueButton(SUPERVISION_VIDEO, dialog() as HTMLElement)).toHaveAccessibleName(
                /: tenants.permissions.policy.activated/,
            ),
        );
        expect(onPolicyChange).not.toHaveBeenCalled();
    });

    it('asks about the privacy policy before supervision is switched on', async () => {
        const user = userEvent.setup();
        const onPolicyChange = vi.fn();
        render(
            <PermissionsSettingsView
                {...baseProps({ onPolicyChange, permissionPolicies: { [SUPERVISION]: policy(false) } })}
            />,
        );

        await user.click(valueButton(SUPERVISION, supervisionTile()));
        expect(onPolicyChange).not.toHaveBeenCalled();
        await user.click(await screen.findByRole('button', { name: 'supervision.privacyConfirm.confirm' }));
        expect(onPolicyChange).toHaveBeenCalledWith(SUPERVISION, expect.objectContaining({ value: true }));
    });

    // The cascade: an inherited requirement locks the level below, which shows it without a switch.
    it.each<[Level, string]>([
        ['tenant', 'a platform requirement locks the Träger'],
        ['agency', 'a Träger requirement locks the centre'],
    ])('%s: %s', (policyLevel) => {
        render(
            <PermissionsSettingsView
                {...baseProps({ policyLevel, permissionPolicies: { [SUPERVISION]: policy(true, 'ENFORCED', true) } })}
            />,
        );

        expect(valueButton(SUPERVISION, supervisionTile())).toBeDisabled();
        expect(lockOrNull(SUPERVISION, supervisionTile())).toBeNull();
    });

    it('platform: sets the supervision master as a requirement for every Träger', async () => {
        const user = userEvent.setup();
        const onPolicyChange = vi.fn();
        render(
            <PermissionsSettingsView
                {...baseProps({
                    onPolicyChange,
                    policyLevel: 'platform',
                    permissionPolicies: { [SUPERVISION]: policy(true) },
                })}
            />,
        );

        await user.click(lockOrNull(SUPERVISION, supervisionTile()) as HTMLElement);
        expect(onPolicyChange).toHaveBeenCalledWith(SUPERVISION, { value: true, mode: 'ENFORCED' });
    });
});

describe('Team-Chat on the Mail Beratung tile', () => {
    const teamChatSection = () =>
        within(screen.getByTestId('chat-type-card-oneOnOne')).getByRole('group', { name: 'teamFunctions.chat.name' });

    it('Träger: switches the Träger value, without a requirement lock (no level stores it below)', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(
            <PermissionsSettingsView
                {...baseProps({ traegerSettings: { source: 'own', values: { [TEAM_CHAT]: true }, onChange } })}
            />,
        );

        expect(lockOrNull(TEAM_CHAT, teamChatSection())).toBeNull();
        await user.click(valueButton(TEAM_CHAT, teamChatSection()));
        expect(onChange).toHaveBeenCalledWith(TEAM_CHAT, false);
    });

    it("centre: shows the Träger's value read-only and says so", () => {
        render(
            <PermissionsSettingsView
                {...baseProps({
                    policyLevel: 'agency',
                    traegerSettings: { source: 'traeger', status: 'success', values: { [TEAM_CHAT]: true } },
                })}
            />,
        );

        expect(valueButton(TEAM_CHAT, teamChatSection())).toBeDisabled();
        expect(within(teamChatSection()).getByText(/tenants.permissions.traegerSetting.fromTraeger/)).toBeVisible();
    });

    it('platform: holds no value and says where it is set', () => {
        render(<PermissionsSettingsView {...baseProps({ policyLevel: 'platform' })} />);

        expect(teamChatSection().querySelector(`[data-feature-policy="${TEAM_CHAT}"]`)).toBeNull();
        expect(within(teamChatSection()).getByText(/tenants.permissions.traegerSetting.perTraeger/)).toBeVisible();
    });
});

describe('Group-chat umbrella follows the group tiles', () => {
    it.each<Level>(['platform', 'tenant'])(
        '%s: switching the last group tile off turns the umbrella off',
        async (policyLevel) => {
            const user = userEvent.setup();
            const onPolicyChange = vi.fn();
            render(
                <PermissionsSettingsView
                    {...baseProps({
                        onPolicyChange,
                        policyLevel,
                        permissionPolicies: {
                            [CIRCLES]: policy(true),
                            [INTERNAL]: policy(false),
                            [UMBRELLA]: policy(true),
                        },
                    })}
                />,
            );

            await user.click(valueButton(CIRCLES, screen.getByTestId('chat-type-card-group')));
            expect(onPolicyChange).toHaveBeenNthCalledWith(1, CIRCLES, { value: false, mode: 'SUGGESTED' });
            expect(onPolicyChange).toHaveBeenNthCalledWith(2, UMBRELLA, {
                value: false,
                mode: 'SUGGESTED',
                inherited: false,
            });
        },
    );

    it('agency: writes the centre value, never a requirement', async () => {
        const user = userEvent.setup();
        const onPolicyChange = vi.fn();
        render(
            <PermissionsSettingsView
                {...baseProps({
                    onPolicyChange,
                    policyLevel: 'agency',
                    permissionPolicies: {
                        [CIRCLES]: policy(false),
                        [INTERNAL]: policy(false),
                        [UMBRELLA]: policy(false),
                    },
                })}
            />,
        );

        await user.click(valueButton(INTERNAL, screen.getByTestId('chat-type-card-groupInternal')));
        expect(onPolicyChange).toHaveBeenCalledWith(UMBRELLA, { value: true, mode: 'SUGGESTED', inherited: false });
    });

    it('leaves the umbrella alone while it is locked from above, or already matches', async () => {
        const user = userEvent.setup();
        const onPolicyChange = vi.fn();
        render(
            <PermissionsSettingsView
                {...baseProps({
                    onPolicyChange,
                    policyLevel: 'tenant',
                    permissionPolicies: {
                        [CIRCLES]: policy(true),
                        [INTERNAL]: policy(true),
                        [UMBRELLA]: policy(true, 'ENFORCED', true),
                    },
                })}
            />,
        );

        await user.click(valueButton(CIRCLES, screen.getByTestId('chat-type-card-group')));
        await user.click(valueButton(INTERNAL, screen.getByTestId('chat-type-card-groupInternal')));
        expect(onPolicyChange.mock.calls.map(([field]) => field)).toEqual([CIRCLES, INTERNAL]);
    });
});

describe('Träger call permission follows the call switches', () => {
    const allCallsOff = {
        featureCallsEnabled: policy(true),
        featureVideoCallsOneOnOneChatsEnabled: policy(true),
        featureAudioCallsOneOnOneChatsEnabled: policy(false),
        featureVideoCallsAnonymousChatsEnabled: policy(false),
        featureAudioCallsAnonymousChatsEnabled: policy(false),
        featureVideoCallsGroupChatsEnabled: policy(false),
        featureAudioCallsGroupChatsEnabled: policy(false),
    };

    it('reports "no calls" when the last call switch goes off, and "calls" when one comes back', async () => {
        const user = userEvent.setup();
        const onCallsAllowedChange = vi.fn();
        const { rerender } = render(
            <PermissionsSettingsView {...baseProps({ onCallsAllowedChange, permissionPolicies: allCallsOff })} />,
        );
        const mail = screen.getByTestId('chat-type-card-oneOnOne');

        await user.click(valueButton('featureVideoCallsOneOnOneChatsEnabled', mail));
        expect(onCallsAllowedChange).toHaveBeenLastCalledWith(false, {
            field: 'featureVideoCallsOneOnOneChatsEnabled',
            value: false,
        });

        rerender(
            <PermissionsSettingsView
                {...baseProps({
                    onCallsAllowedChange,
                    permissionPolicies: { ...allCallsOff, featureVideoCallsOneOnOneChatsEnabled: policy(false) },
                })}
            />,
        );
        await user.click(
            valueButton('featureAudioCallsOneOnOneChatsEnabled', screen.getByTestId('chat-type-card-oneOnOne')),
        );
        expect(onCallsAllowedChange).toHaveBeenLastCalledWith(true, {
            field: 'featureAudioCallsOneOnOneChatsEnabled',
            value: true,
        });
    });

    it('does not report for switches that do not concern calls', async () => {
        const user = userEvent.setup();
        const onCallsAllowedChange = vi.fn();
        render(<PermissionsSettingsView {...baseProps({ onCallsAllowedChange, permissionPolicies: allCallsOff })} />);

        await user.click(valueButton('featureThreadsOneOnOneEnabled', screen.getByTestId('chat-type-card-oneOnOne')));
        expect(onCallsAllowedChange).not.toHaveBeenCalled();
    });
});
