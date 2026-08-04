import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EnforceModeSwitch } from './index';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));

afterEach(cleanup);

describe('EnforceModeSwitch', () => {
    it('calls onChange(false) when Config is clicked', () => {
        const onChange = vi.fn();
        render(<EnforceModeSwitch enforceMode onChange={onChange} />);

        fireEvent.click(screen.getByText('tenants.permissions.enforce.configAction'));

        expect(onChange).toHaveBeenCalledWith(false);
    });

    it('calls onChange(true) when Enforce Activated Selections is clicked', () => {
        const onChange = vi.fn();
        render(<EnforceModeSwitch enforceMode={false} onChange={onChange} />);

        fireEvent.click(screen.getByText('tenants.permissions.enforce.action'));

        expect(onChange).toHaveBeenCalledWith(true);
    });

    it('marks the active mode button so it can be styled distinctly', () => {
        const { rerender } = render(<EnforceModeSwitch enforceMode onChange={() => {}} />);
        expect(screen.getByText('tenants.permissions.enforce.action').closest('button')).toHaveAttribute(
            'aria-pressed',
            'true',
        );
        expect(screen.getByText('tenants.permissions.enforce.configAction').closest('button')).toHaveAttribute(
            'aria-pressed',
            'false',
        );

        rerender(<EnforceModeSwitch enforceMode={false} onChange={() => {}} />);
        expect(screen.getByText('tenants.permissions.enforce.configAction').closest('button')).toHaveAttribute(
            'aria-pressed',
            'true',
        );
    });
});
