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
}));

const t = (key: string) => key;

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t }),
}));

// vitest has no svgr plugin — stub the icon's ReactComponent export.
vi.mock('../../../../../resources/img/svg/permissions/case_handover.svg', () => ({
    ReactComponent: () => null,
}));

vi.mock('../../../../../hooks/useCaseHandoverReasonPolicies', () => ({
    useCaseHandoverReasonPoliciesData: () => ({
        data: mocks.policies,
        isLoading: false,
        isError: false,
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
    });

    it('master toggle writes enabled on every reason and normalizes empty policyAuthority to null', async () => {
        const user = userEvent.setup();
        render(<CaseHandoverCard />);

        await user.click(screen.getByRole('switch', { name: 'tenants.permissions.card.activated' }));

        await waitFor(() => {
            expect(mocks.mutate).toHaveBeenCalledWith([
                expect.objectContaining({
                    code: 'COUNSELLOR_ASKED_FOR_ADVICE',
                    enabled: false,
                    policyAuthority: null,
                }),
                expect.objectContaining({ code: 'COUNSELLOR_IS_ILL', enabled: false }),
            ]);
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
            expect(mocks.mutate).toHaveBeenCalledWith([
                expect.objectContaining({
                    code: 'COUNSELLOR_ASKED_FOR_ADVICE',
                    clientConsentRequired: false,
                }),
                expect.objectContaining({
                    code: 'COUNSELLOR_IS_ILL',
                    clientConsentRequired: false,
                }),
            ]);
        });
    });

    it('advisor consent and opt-out controls are visible but disabled (backend pending)', () => {
        render(<CaseHandoverCard />);

        expect(
            screen.getByRole('switch', { name: /tenants.permissions.card.caseHandover.consentAdvisor/ }),
        ).toBeDisabled();
        expect(
            screen.getByRole('switch', { name: 'tenants.permissions.card.caseHandover.optOutMessage' }),
        ).toBeDisabled();
    });
});
