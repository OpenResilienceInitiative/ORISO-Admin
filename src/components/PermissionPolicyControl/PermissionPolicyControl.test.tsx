import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PermissionPolicyControl } from './PermissionPolicyControl';

describe('PermissionPolicyControl', () => {
    it('offers all four states to upper roles and auto-reports the selection', async () => {
        const onChange = vi.fn();
        const user = userEvent.setup();
        render(
            <PermissionPolicyControl
                featureKey="featureSupervisionEnabled"
                label="Supervision"
                level="tenant"
                policy={{ value: true, mode: 'SUGGESTED' }}
                open
                onOpenChange={vi.fn()}
                onChange={onChange}
            />,
        );

        await user.click(screen.getByRole('button', { name: 'tenants.permissions.policy.deactivationEnforced' }));
        expect(onChange).toHaveBeenCalledWith({ value: false, mode: 'ENFORCED' });
    });

    it('opens information directly for inherited enforced values', async () => {
        const user = userEvent.setup();
        render(
            <PermissionPolicyControl
                featureKey="featureSupervisionEnabled"
                label="Supervision"
                level="tenant"
                policy={{ value: true, mode: 'ENFORCED', inherited: true }}
                open={false}
                onOpenChange={vi.fn()}
                onChange={vi.fn()}
            />,
        );

        await user.click(screen.getByRole('button', { name: /Supervision/i }));
        expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it.each([{ pending: true }, { disabled: true }])('locks the menu while unavailable: %o', async (lock) => {
        const user = userEvent.setup();
        const onOpenChange = vi.fn();
        const onChange = vi.fn();
        render(
            <PermissionPolicyControl
                featureKey="featureSupervisionEnabled"
                label="Supervision"
                level="tenant"
                policy={{ value: true, mode: 'SUGGESTED' }}
                open={false}
                onOpenChange={onOpenChange}
                onChange={onChange}
                {...lock}
            />,
        );

        const button = screen.getByRole('button', { name: /Supervision/ });
        expect(button).toBeDisabled();
        await user.click(button);
        expect(onOpenChange).not.toHaveBeenCalled();
        expect(onChange).not.toHaveBeenCalled();
    });
});
