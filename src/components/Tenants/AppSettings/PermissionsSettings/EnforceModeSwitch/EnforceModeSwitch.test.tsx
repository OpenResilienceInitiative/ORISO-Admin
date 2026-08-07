import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EnforceModeSwitch } from './index';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));

afterEach(cleanup);

const configLabel = 'tenants.permissions.enforce.configAction';
const enforceLabel = 'tenants.permissions.enforce.action';

describe('EnforceModeSwitch', () => {
    it('calls onChange(false) when Config is clicked', () => {
        const onChange = vi.fn();
        render(<EnforceModeSwitch enforceMode onChange={onChange} />);

        fireEvent.click(screen.getByRole('button', { name: configLabel }));

        expect(onChange).toHaveBeenCalledWith(false);
    });

    it('calls onChange(true) when Enforce Activated Selections is clicked', () => {
        const onChange = vi.fn();
        render(<EnforceModeSwitch enforceMode={false} onChange={onChange} />);

        fireEvent.click(screen.getByRole('button', { name: enforceLabel }));

        expect(onChange).toHaveBeenCalledWith(true);
    });

    it('marks the active mode button so it can be styled distinctly', () => {
        const { rerender } = render(<EnforceModeSwitch enforceMode onChange={() => {}} />);
        expect(screen.getByRole('button', { name: enforceLabel })).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByRole('button', { name: configLabel })).toHaveAttribute('aria-pressed', 'false');

        rerender(<EnforceModeSwitch enforceMode={false} onChange={() => {}} />);
        expect(screen.getByRole('button', { name: configLabel })).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByRole('button', { name: enforceLabel })).toHaveAttribute('aria-pressed', 'false');
    });
});
