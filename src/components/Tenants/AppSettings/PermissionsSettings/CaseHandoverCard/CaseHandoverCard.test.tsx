import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CaseHandoverCard } from './index';

const mocks = vi.hoisted(() => ({
    mutate: vi.fn(),
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
    dataState: { isError: false },
}));

const t = (key: string) => key;

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t, i18n: { language: 'de' } }),
}));

// vitest has no svgr plugin — stub the icon's ReactComponent export.
vi.mock('../../../../../resources/img/svg/permissions/case_handover.svg', () => ({
    ReactComponent: () => null,
}));

vi.mock('../../../../../hooks/useCaseHandoverReasonPolicies', () => ({
    useCaseHandoverReasonPoliciesData: () => ({
        data: mocks.policies,
        isLoading: false,
        isError: mocks.dataState.isError,
    }),
    useCaseHandoverReasonPoliciesMutation: () => ({
        isPending: false,
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
        mocks.dataState.isError = false;
    });

    it('master policy selection writes enabled on every reason and normalizes empty policyAuthority to null', async () => {
        const user = userEvent.setup();
        render(<CaseHandoverCard />);

        await user.click(
            screen.getByRole('button', {
                name: 'tenants.permissions.card.caseHandover.enabled: tenants.permissions.policy.openMenu – tenants.permissions.policy.activationSuggested',
            }),
        );
        await user.click(screen.getByRole('button', { name: 'tenants.permissions.policy.deactivationSuggested' }));

        await waitFor(() => {
            expect(mocks.mutate).toHaveBeenCalledWith(
                [
                    expect.objectContaining({
                        code: 'COUNSELLOR_ASKED_FOR_ADVICE',
                        enabled: false,
                        policyAuthority: null,
                    }),
                    expect.objectContaining({ code: 'COUNSELLOR_IS_ILL', enabled: false }),
                ],
                expect.anything(),
            );
        });
    });

    it('client-consent toggle updates only the active reason', async () => {
        const user = userEvent.setup();
        render(<CaseHandoverCard />);

        // First tab (lowest displayOrder) is active by default.
        await user.click(
            screen.getByRole('switch', {
                name: /tenants.permissions.card.caseHandover.consentClient/,
            }),
        );

        await waitFor(() => {
            expect(mocks.mutate).toHaveBeenCalledWith(
                [
                    expect.objectContaining({
                        code: 'COUNSELLOR_ASKED_FOR_ADVICE',
                        clientConsentRequired: false,
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

    it('persists an edited notification template on blur (PUT payload carries the language map)', async () => {
        const user = userEvent.setup();
        render(<CaseHandoverCard />);

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
        render(<CaseHandoverCard />);

        // t() is mocked to return the key, so the label falls back to the raw code.
        await user.click(screen.getByRole('tab', { name: 'LEGAL_VIOLATION' }));

        expect(screen.getByText('tenants.permissions.card.caseHandover.placeholderHint')).toBeInTheDocument();
        expect(screen.getByRole('switch', { name: /caseHandover.consentClient.*LEGAL_VIOLATION/ })).toBeDisabled();
        expect(mocks.mutate).not.toHaveBeenCalled();
    });

    it('keeps advisor consent disabled without adding a standalone team-access policy', () => {
        render(<CaseHandoverCard />);

        expect(
            screen.getByRole('switch', { name: /tenants.permissions.card.caseHandover.consentAdvisor/ }),
        ).toBeDisabled();
        expect(
            screen.queryByRole('button', {
                name: /tenants.permissions.card.caseHandover.teamAccessOptOut/,
            }),
        ).not.toBeInTheDocument();
    });

    it('removes the former global enforce checkboxes', () => {
        render(<CaseHandoverCard />);

        expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
        expect(screen.getAllByTestId('CheckIcon')).not.toHaveLength(0);
        expect(mocks.mutate).not.toHaveBeenCalled();
    });

    it('places the card description before the specifically named master policy', () => {
        render(<CaseHandoverCard />);

        const description = screen.getByText('tenants.permissions.card.caseHandover.description');
        const masterPolicy = screen.getByText('tenants.permissions.card.caseHandover.enabled');

        expect(description.compareDocumentPosition(masterPolicy)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    });

    it('opens all four policy choices plus information from the master policy button', async () => {
        const user = userEvent.setup();
        render(<CaseHandoverCard />);

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

    it('rolls back the optimistic toggle when the save fails', async () => {
        mocks.mutate.mockImplementation((_payload, options) => {
            options?.onError?.(new Error('save failed'));
        });
        const user = userEvent.setup();
        render(<CaseHandoverCard />);

        const openMasterMenu = () =>
            screen.getByRole('button', {
                name: 'tenants.permissions.card.caseHandover.enabled: tenants.permissions.policy.openMenu – tenants.permissions.policy.activationSuggested',
            });
        await user.click(openMasterMenu());
        await user.click(screen.getByRole('button', { name: 'tenants.permissions.policy.deactivationSuggested' }));

        await waitFor(() => {
            expect(mocks.mutate).toHaveBeenCalled();
        });
        await user.click(openMasterMenu());
        expect(screen.getByRole('button', { name: 'tenants.permissions.policy.activationSuggested' })).toHaveAttribute(
            'aria-current',
            'page',
        );
    });

    it('steps Advice Needed duration by 15 minutes from the three-hour default without a maximum', async () => {
        const user = userEvent.setup();
        render(<CaseHandoverCard />);

        await user.click(screen.getByRole('button', { name: 'm3NumberField.increase' }));

        await waitFor(() => expect(mocks.mutate).toHaveBeenCalled());
        const payload = mocks.mutate.mock.calls.at(-1)?.[0];
        expect(payload.find((policy: { code: string }) => policy.code === 'COUNSELLOR_ASKED_FOR_ADVICE')).toEqual(
            expect.objectContaining({ maxAccessDurationMinutes: 195 }),
        );
    });

    it('shows an admin-visible error instead of disappearing when the reason policies fail to load', () => {
        mocks.dataState.isError = true;
        render(<CaseHandoverCard />);

        expect(screen.getByTestId('case-handover-card-error')).toBeInTheDocument();
        expect(screen.queryByTestId('case-handover-card')).not.toBeInTheDocument();
    });
});
