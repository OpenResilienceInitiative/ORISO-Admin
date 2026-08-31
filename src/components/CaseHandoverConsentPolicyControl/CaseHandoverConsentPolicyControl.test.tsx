import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CaseHandoverConsentPolicyControl } from './CaseHandoverConsentPolicyControl';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));

describe('CaseHandoverConsentPolicyControl', () => {
    it('offers the five Figma consent policies plus information in their canonical order', async () => {
        render(
            <CaseHandoverConsentPolicyControl
                label="tenants.permissions.card.caseHandover.consentClient"
                policy={{ value: 'OPT_IN', mode: 'SUGGESTED' }}
                open
                onOpenChange={vi.fn()}
                onChange={vi.fn()}
            />,
        );

        expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual([
            'tenants.permissions.consent.optInEnforced',
            'tenants.permissions.consent.optOutEnforced',
            'tenants.permissions.consent.noneSuggested',
            'tenants.permissions.consent.optInSuggested',
            'tenants.permissions.consent.optOutSuggested',
            'tenants.permissions.policy.moreInformation',
            '',
        ]);
    });

    it.each([
        ['OPT_IN', 'switch-on'],
        ['OPT_OUT', 'switch-off'],
        ['NONE', 'silent'],
    ] as const)('uses the supplied %s status glyph while the menu is closed', (value, icon) => {
        render(
            <CaseHandoverConsentPolicyControl
                label="Consent"
                policy={{ value, mode: 'SUGGESTED' }}
                open={false}
                onOpenChange={vi.fn()}
                onChange={vi.fn()}
            />,
        );

        expect(document.querySelector(`[data-icon="${icon}"]`)).toBeInTheDocument();
    });

    it('reports the selected consent value and mode', async () => {
        const onChange = vi.fn();
        render(
            <CaseHandoverConsentPolicyControl
                label="Consent"
                policy={{ value: 'NONE', mode: 'SUGGESTED' }}
                open
                onOpenChange={vi.fn()}
                onChange={onChange}
            />,
        );

        await userEvent.click(screen.getByRole('button', { name: 'tenants.permissions.consent.optOutEnforced' }));
        expect(onChange).toHaveBeenCalledWith({ value: 'OPT_OUT', mode: 'ENFORCED' });
    });
});
