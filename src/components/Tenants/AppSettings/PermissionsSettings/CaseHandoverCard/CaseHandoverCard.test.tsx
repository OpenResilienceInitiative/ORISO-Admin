import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CaseHandoverCard } from './index';
import { CaseHandoverCardView, type CaseHandoverCardViewProps } from './CaseHandoverCardView';

const mocks = vi.hoisted(() => ({
    mutate: vi.fn(),
    defaultPolicies: [
        {
            code: 'COUNSELLOR_ASKED_FOR_ADVICE',
            label: 'Counsellor asked for advice',
            clientConsentRequired: true,
            accessAllowed: true,
            enabled: true,
            displayOrder: 10,
            policyAuthority: '',
        },
        {
            code: 'COUNSELLOR_IS_ILL',
            label: 'Counsellor is ill',
            clientConsentRequired: false,
            accessAllowed: true,
            enabled: true,
            displayOrder: 40,
            policyAuthority: 'platform-admin-default-case-handover-policy',
        },
    ],
    policies: [
        {
            code: 'COUNSELLOR_ASKED_FOR_ADVICE',
            label: 'Counsellor asked for advice',
            clientConsentRequired: true,
            accessAllowed: true,
            enabled: true,
            displayOrder: 10,
            policyAuthority: '',
        },
        {
            code: 'COUNSELLOR_IS_ILL',
            label: 'Counsellor is ill',
            clientConsentRequired: false,
            accessAllowed: true,
            enabled: true,
            displayOrder: 40,
            policyAuthority: 'platform-admin-default-case-handover-policy',
        },
    ],
    dataState: { isError: false, isLoading: false },
    refetch: vi.fn(),
    mutationState: { isPending: false },
}));

const t = (key: string) => key;

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t, i18n: { language: 'de' } }),
}));

// vitest has no svgr plugin — stub the icon's ReactComponent export.
vi.mock('../../../../../resources/img/svg/permissions/case_handover.svg', () => ({
    ReactComponent: () => null,
}));

vi.mock('../../../../../hooks/useCaseHandoverReasonPolicies', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../../../../../hooks/useCaseHandoverReasonPolicies')>()),
    useCaseHandoverReasonPoliciesData: () => ({
        data: mocks.policies,
        isLoading: mocks.dataState.isLoading,
        isError: mocks.dataState.isError,
        refetch: mocks.refetch,
    }),
    useCaseHandoverReasonPoliciesMutation: () => ({
        isPending: mocks.mutationState.isPending,
        mutate: mocks.mutate,
    }),
}));

vi.mock('../../../../../hooks/useUserPermission', () => ({
    useUserPermissions: () => ({
        can: () => true,
    }),
}));

vi.mock('../../../../../hooks/useUserRoles.hook', () => ({
    useUserRoles: () => ({
        isSuperAdmin: true,
    }),
}));

describe('CaseHandoverCard', () => {
    beforeEach(() => {
        mocks.mutate.mockReset();
        mocks.policies = mocks.defaultPolicies;
        mocks.dataState.isError = false;
        mocks.dataState.isLoading = false;
        mocks.mutationState.isPending = false;
    });

    it('keeps the agency master read-only even when the parent only suggests it', async () => {
        const user = userEvent.setup();
        const onFeaturePolicyChange = vi.fn();
        render(
            <CaseHandoverCard
                tenantId={7}
                policyLevel="agency"
                openPolicyMenu="caseHandoverEnabled"
                permissionPolicies={{ caseHandoverEnabled: { value: true, mode: 'SUGGESTED', inherited: true } }}
                onFeaturePolicyChange={onFeaturePolicyChange}
            />,
        );

        const master = screen.getByRole('button', {
            name: 'tenants.permissions.card.caseHandover.enabled: tenants.permissions.policy.openMenu – tenants.permissions.policy.activationSuggested',
        });
        expect(master).toBeDisabled();
        expect(screen.getByText('tenants.permissions.card.caseHandover.readOnlyNote')).toBeVisible();
        expect(screen.queryByRole('button', { name: 'tenants.permissions.policy.deactivationSuggested' })).toBeNull();
        await user.click(master);
        expect(onFeaturePolicyChange).not.toHaveBeenCalled();
        expect(mocks.mutate).not.toHaveBeenCalled();
    });

    it('master selection writes only the canonical policy and preserves individual reasons', async () => {
        const user = userEvent.setup();
        const onFeaturePolicyChange = vi.fn();
        mocks.policies = [mocks.defaultPolicies[0], { ...mocks.defaultPolicies[1], enabled: false }];
        render(<CaseHandoverCard tenantId={7} onFeaturePolicyChange={onFeaturePolicyChange} />);

        await user.click(
            screen.getByRole('button', {
                name: 'tenants.permissions.card.caseHandover.enabled: tenants.permissions.policy.openMenu – tenants.permissions.policy.activationSuggested',
            }),
        );
        await user.click(screen.getByRole('button', { name: 'tenants.permissions.policy.deactivationSuggested' }));

        expect(onFeaturePolicyChange).toHaveBeenCalledWith('caseHandoverEnabled', {
            value: false,
            mode: 'SUGGESTED',
        });
        expect(mocks.mutate).not.toHaveBeenCalled();
        expect(mocks.policies.map(({ enabled }) => enabled)).toEqual([true, false]);
    });

    it('client-consent policy updates only the active reason', async () => {
        const user = userEvent.setup();
        render(<CaseHandoverCard tenantId={7} />);

        // First tab (lowest displayOrder) is active by default.
        await user.click(
            screen.getByRole('button', {
                name: /tenants.permissions.card.caseHandover.consentClient: tenants.permissions.policy.openMenu/,
            }),
        );
        await user.click(screen.getByRole('button', { name: 'tenants.permissions.consent.noneSuggested' }));

        await waitFor(() => {
            expect(mocks.mutate).toHaveBeenCalledWith(
                [
                    expect.objectContaining({
                        code: 'COUNSELLOR_ASKED_FOR_ADVICE',
                        clientConsentRequired: false,
                        policyAuthority: null,
                        clientConsent: { value: 'NONE', mode: 'SUGGESTED' },
                    }),
                    expect.objectContaining({
                        code: 'COUNSELLOR_IS_ILL',
                        clientConsentRequired: false,
                    }),
                ],
                expect.anything(),
            );
        });
    });

    // Exactly what GET /service/users/case-handover/reason-policies answers: `clientConsent` as
    // the bare enum string, the mode beside it. The card used to read only the policy-object
    // shape, so a saved Opt-Out came back looking unset — UserService #1131.
    it('shows the stored consent policy after a reload of the UserService wire shape', async () => {
        mocks.policies = [
            {
                code: 'COUNSELLOR_ASKED_FOR_ADVICE',
                label: 'Counsellor asked for advice',
                clientConsent: 'OPT_OUT',
                clientConsentMode: 'ENFORCED',
                clientConsentRequired: false,
                accessAllowed: true,
                enabled: true,
                displayOrder: 10,
                policyAuthority: 'tenant-admin-case-handover-policy',
                maxAccessDurationMinutes: 90,
            },
        ];
        render(<CaseHandoverCard tenantId={7} />);

        expect(
            screen.getByRole('button', {
                name: /tenants.permissions.card.caseHandover.consentClient: tenants.permissions.policy.openMenu – tenants.permissions.consent.optOutEnforced/,
            }),
        ).toBeTruthy();
        expect(screen.getByDisplayValue('1 h 30 min')).toBeTruthy();
    });

    it('persists an edited notification template on blur (PUT payload carries the language map)', async () => {
        const user = userEvent.setup();
        render(<CaseHandoverCard tenantId={7} />);

        await user.click(screen.getByRole('tab', { name: 'Counsellor is ill' }));
        const input = screen.getByTestId('case-handover-template-input');
        await user.clear(input);
        await user.type(input, 'Eigener Uebergabetext.');
        await user.tab();

        await waitFor(() => {
            expect(mocks.mutate).toHaveBeenCalled();
        });
        const payload = mocks.mutate.mock.calls.at(-1)?.[0];
        const illPolicy = payload.find((policy: { code: string }) => policy.code === 'COUNSELLOR_IS_ILL');
        expect(illPolicy.clientNotificationTemplates).toEqual({ de: 'Eigener Uebergabetext.' });
    });

    it('shows the legal-violation placeholder tab with disabled consent controls and no persistence', async () => {
        const user = userEvent.setup();
        render(<CaseHandoverCard tenantId={7} />);

        // t() is mocked to return the key, so the label falls back to the raw code.
        await user.click(screen.getByRole('tab', { name: 'LEGAL_VIOLATION' }));

        expect(screen.getByText('tenants.permissions.card.caseHandover.placeholderHint')).toBeInTheDocument();
        expect(
            screen.getByRole('button', {
                name: /tenants.permissions.card.caseHandover.consentClient: tenants.permissions.policy.openMenu/,
            }),
        ).toBeDisabled();
        expect(mocks.mutate).not.toHaveBeenCalled();
    });

    it('keeps advisor consent disabled without adding a standalone team-access policy', () => {
        render(<CaseHandoverCard tenantId={7} />);

        expect(
            screen.getByRole('button', {
                name: /tenants.permissions.card.caseHandover.consentAdvisor: tenants.permissions.policy.moreInformation/,
            }),
        ).toBeEnabled();
        expect(
            screen.queryByRole('button', {
                name: /tenants.permissions.card.caseHandover.teamAccessOptOut/,
            }),
        ).not.toBeInTheDocument();
    });

    it('removes the former global enforce checkboxes', () => {
        render(<CaseHandoverCard tenantId={7} />);

        expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
        expect(screen.getAllByTestId('CheckIcon')).not.toHaveLength(0);
        expect(mocks.mutate).not.toHaveBeenCalled();
    });

    it('places the card description before the specifically named master policy', () => {
        render(<CaseHandoverCard tenantId={7} />);

        const description = screen.getByText('tenants.permissions.card.caseHandover.description');
        const masterPolicy = screen.getByText('tenants.permissions.card.caseHandover.enabled');

        expect(description.compareDocumentPosition(masterPolicy)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    });

    it('opens all four policy choices plus information from the master policy button', async () => {
        const user = userEvent.setup();
        render(<CaseHandoverCard tenantId={7} onFeaturePolicyChange={vi.fn()} />);

        await user.click(
            screen.getByRole('button', {
                name: /tenants.permissions.card.caseHandover.enabled: tenants.permissions.policy.openMenu/,
            }),
        );

        expect(screen.getByRole('button', { name: 'tenants.permissions.policy.activationEnforced' })).toBeVisible();
        expect(screen.getByRole('button', { name: 'tenants.permissions.policy.deactivationEnforced' })).toBeVisible();
        expect(screen.getByRole('button', { name: 'tenants.permissions.policy.activationSuggested' })).toBeVisible();
        expect(screen.getByRole('button', { name: 'tenants.permissions.policy.deactivationSuggested' })).toBeVisible();
        expect(screen.getByRole('button', { name: 'tenants.permissions.policy.moreInformation' })).toBeVisible();
    });

    it('locks the master policy while a reason-policy save is pending', () => {
        mocks.mutationState.isPending = true;

        render(<CaseHandoverCard tenantId={7} onFeaturePolicyChange={vi.fn()} />);

        expect(
            screen.getByRole('button', {
                name: /tenants.permissions.card.caseHandover.enabled: tenants.permissions.policy.openMenu/,
            }),
        ).toBeDisabled();
    });

    // FE#1725: no silent rollback; the edit stays and an error says it was not saved.
    it('keeps the reason edit and shows an error when its save fails', async () => {
        mocks.mutate.mockImplementation((_payload, options) => {
            options?.onError?.(new Error('save failed'));
        });
        const user = userEvent.setup();
        render(<CaseHandoverCard tenantId={7} />);

        await user.click(
            screen.getByRole('button', {
                name: /tenants.permissions.card.caseHandover.consentClient: tenants.permissions.policy.openMenu/,
            }),
        );
        await user.click(screen.getByRole('button', { name: 'tenants.permissions.consent.noneSuggested' }));

        expect(await screen.findByRole('alert')).toHaveTextContent(
            'tenants.permissions.card.caseHandover.saveFailed.other',
        );
        expect(
            screen.getByRole('button', {
                name: /tenants.permissions.card.caseHandover.consentClient: tenants.permissions.policy.openMenu/,
            }),
        ).toHaveAccessibleName(/tenants.permissions.consent.noneSuggested/);
    });

    it('steps Advice Needed duration by 15 minutes from the three-hour default without a maximum', async () => {
        const user = userEvent.setup();
        render(<CaseHandoverCard tenantId={7} />);

        await user.click(screen.getByRole('button', { name: 'm3NumberField.increase' }));

        await waitFor(() => expect(mocks.mutate).toHaveBeenCalled());
        const payload = mocks.mutate.mock.calls.at(-1)?.[0];
        expect(payload.find((policy: { code: string }) => policy.code === 'COUNSELLOR_ASKED_FOR_ADVICE')).toEqual(
            expect.objectContaining({ maxAccessDurationMinutes: 195 }),
        );
    });

    it('shows an admin-visible error instead of disappearing when the reason policies fail to load', () => {
        mocks.dataState.isError = true;
        render(<CaseHandoverCard tenantId={7} />);

        expect(screen.getByTestId('case-handover-card-error')).toBeInTheDocument();
        expect(screen.getByTestId('case-handover-card')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /caseHandover.enabled:/ })).not.toBeInTheDocument();
    });

    // After US#1245 the endpoint answers the neutral codes only.
    describe('with the neutral reason codes', () => {
        const neutralPolicies = [
            {
                code: 'ADVICE_REQUESTED',
                label: 'Advice requested',
                clientConsentRequired: true,
                accessAllowed: true,
                enabled: true,
                displayOrder: 10,
                policyAuthority: null,
                maxAccessDurationMinutes: 120,
            },
            {
                code: 'UNPLANNED_ABSENCE',
                label: 'Unplanned absence',
                clientConsentRequired: false,
                accessAllowed: true,
                enabled: true,
                displayOrder: 40,
                policyAuthority: null,
            },
        ];

        const advisorConsentButton = () =>
            screen.getByRole('button', {
                name: /tenants.permissions.card.caseHandover.consentAdvisor: tenants.permissions.policy.moreInformation/,
            });

        beforeEach(() => {
            mocks.policies = neutralPolicies;
        });

        it('shows and saves the advice time limit on ADVICE_REQUESTED', async () => {
            const user = userEvent.setup();
            render(<CaseHandoverCard tenantId={7} />);

            expect(screen.getByDisplayValue('2 h')).toBeTruthy();
            await user.click(screen.getByRole('button', { name: 'm3NumberField.increase' }));

            await waitFor(() => expect(mocks.mutate).toHaveBeenCalled());
            const payload = mocks.mutate.mock.calls.at(-1)?.[0];
            expect(payload.find((policy: { code: string }) => policy.code === 'ADVICE_REQUESTED')).toEqual(
                expect.objectContaining({ maxAccessDurationMinutes: 135 }),
            );
        });

        it('shows counsellor consent as given for ADVICE_REQUESTED and absent otherwise', async () => {
            const user = userEvent.setup();
            render(<CaseHandoverCard tenantId={7} />);

            expect(advisorConsentButton().querySelector('[data-icon="switch-on"]')).not.toBeNull();

            await user.click(screen.getByRole('tab', { name: 'Unplanned absence' }));
            expect(advisorConsentButton().querySelector('[data-icon="silent"]')).not.toBeNull();
            expect(screen.queryByRole('button', { name: 'm3NumberField.increase' })).not.toBeInTheDocument();
        });
    });

    it('still shows counsellor consent as given for the retired advice code', () => {
        render(<CaseHandoverCard tenantId={7} />);

        expect(
            screen
                .getByRole('button', {
                    name: /tenants.permissions.card.caseHandover.consentAdvisor: tenants.permissions.policy.moreInformation/,
                })
                .querySelector('[data-icon="switch-on"]'),
        ).not.toBeNull();
    });
});

describe('reason state is independent from the canonical master view', () => {
    const viewProps = (): CaseHandoverCardViewProps => ({
        policies: mocks.defaultPolicies,
        isLoading: false,
        canEdit: true,
        moduleEnabled: true,
        onClientConsentPolicyChange: vi.fn(),
        onNotificationTemplateChange: vi.fn(),
        onMaxAccessDurationChange: vi.fn(),
        onFeaturePolicyChange: vi.fn(),
    });
    it('keeps a loaded canonical master available while only reasons are loading', () => {
        render(
            <CaseHandoverCardView
                {...viewProps()}
                isLoading
                permissionPolicies={{ caseHandoverEnabled: { value: true, mode: 'SUGGESTED', inherited: false } }}
            />,
        );
        expect(screen.getByRole('button', { name: /caseHandover.enabled:.*openMenu/ })).toBeEnabled();
        expect(screen.getByTestId('case-handover-card-loading')).toBeVisible();
    });
    it('shows a reason error without stale reason controls and retains canonical master pending semantics', () => {
        render(
            <CaseHandoverCardView
                {...viewProps()}
                loadError="Reasons unavailable"
                permissionPolicies={{ caseHandoverEnabled: { value: true, mode: 'SUGGESTED', inherited: false } }}
                pendingPolicyFields={new Set(['caseHandoverEnabled'])}
            />,
        );
        expect(screen.getByRole('button', { name: /caseHandover.enabled:.*openMenu/ })).toBeDisabled();
        expect(screen.getByTestId('case-handover-card-error')).toHaveTextContent('Reasons unavailable');
        expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    });
    it.each([undefined, JSON.parse('{"caseHandoverEnabled":{"value":true,"mode":"UNKNOWN"}}')])(
        'does not invent a master from reason preferences without valid canonical authority on reason error',
        (permissionPolicies) => {
            render(
                <CaseHandoverCardView
                    {...viewProps()}
                    loadError="Reasons unavailable"
                    permissionPolicies={permissionPolicies}
                />,
            );
            expect(screen.queryByRole('button', { name: /caseHandover.enabled:/ })).not.toBeInTheDocument();
            expect(screen.getByTestId('case-handover-card-error')).toBeVisible();
        },
    );
});

it('withholds stale canonical master authority until the owning Träger is resolved', async () => {
    mocks.policies = mocks.defaultPolicies;
    mocks.dataState.isError = false;
    mocks.dataState.isLoading = false;
    const onFeaturePolicyChange = vi.fn();
    const permissionPolicies = { caseHandoverEnabled: { value: true, mode: 'SUGGESTED' as const, inherited: false } };
    const view = render(
        <CaseHandoverCard
            tenantPending
            permissionPolicies={permissionPolicies}
            onFeaturePolicyChange={onFeaturePolicyChange}
        />,
    );
    expect(screen.getByTestId('case-handover-card-loading')).toBeVisible();
    expect(screen.queryByRole('button', { name: /caseHandover.enabled:/ })).not.toBeInTheDocument();
    expect(onFeaturePolicyChange).not.toHaveBeenCalled();
    view.rerender(
        <CaseHandoverCard
            tenantId={7}
            tenantPending={false}
            permissionPolicies={permissionPolicies}
            onFeaturePolicyChange={onFeaturePolicyChange}
        />,
    );
    const master = screen.getByRole('button', { name: /caseHandover.enabled:.*openMenu/ });
    expect(master).toBeEnabled();
    await userEvent.setup().click(master);
    await userEvent
        .setup()
        .click(screen.getByRole('button', { name: 'tenants.permissions.policy.deactivationSuggested' }));
    expect(onFeaturePolicyChange).toHaveBeenCalledWith('caseHandoverEnabled', { value: false, mode: 'SUGGESTED' });
});
