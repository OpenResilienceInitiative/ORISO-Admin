import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { M3Checkbox } from './index';

describe('M3Checkbox', () => {
    it('exposes the checkbox role and checked state', () => {
        render(<M3Checkbox checked label="Activated" />);
        const checkbox = screen.getByRole('checkbox', { name: 'Activated' });
        expect(checkbox).toHaveAttribute('aria-checked', 'true');
    });

    it('toggles via onChange when enabled', async () => {
        const onChange = vi.fn();
        const user = userEvent.setup();
        render(<M3Checkbox checked={false} label="Activated" onChange={onChange} />);
        await user.click(screen.getByRole('checkbox', { name: 'Activated' }));
        expect(onChange).toHaveBeenCalledWith(true);
    });

    it('does not fire onChange when disabled', async () => {
        const onChange = vi.fn();
        const user = userEvent.setup();
        render(<M3Checkbox checked={false} disabled label="Activated" onChange={onChange} />);
        await user.click(screen.getByRole('checkbox', { name: 'Activated' }));
        expect(onChange).not.toHaveBeenCalled();
        expect(screen.getByRole('checkbox', { name: 'Activated' })).toBeDisabled();
    });
});
