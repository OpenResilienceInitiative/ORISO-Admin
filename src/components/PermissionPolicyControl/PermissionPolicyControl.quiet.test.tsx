import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vite-plus/test';
import { PermissionPolicyControl } from './PermissionPolicyControl';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));

// ORISO-Admin#1558: on cards the page explains "Anpassbar" once; the lock stays a named button.
describe('quietAdjustable', () => {
    it('shows "adjustable" as the open lock only, still named for screen readers', () => {
        render(
            <PermissionPolicyControl
                featureKey="f"
                label="Audioanrufe"
                level="tenant"
                policy={{ value: true, mode: 'SUGGESTED' }}
                onChange={vi.fn()}
                quietAdjustable
            />,
        );

        const lock = screen.getByRole('button', { name: /tenants\.permissions\.policy\.suggestion/ });
        expect(lock).toBeInTheDocument();
        expect(screen.getByText('tenants.permissions.policy.suggestion')).toHaveClass(/visuallyHidden/);
    });

    it('keeps the word for a requirement', () => {
        render(
            <PermissionPolicyControl
                featureKey="f"
                label="Audioanrufe"
                level="tenant"
                policy={{ value: true, mode: 'ENFORCED' }}
                onChange={vi.fn()}
                quietAdjustable
            />,
        );

        expect(screen.getByText('tenants.permissions.policy.enforced')).not.toHaveClass(/visuallyHidden/);
    });
});
