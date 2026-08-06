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

    it('unchecks a checked box via onChange(false)', async () => {
        const onChange = vi.fn();
        const user = userEvent.setup();
        render(<M3Checkbox checked label="Activated" onChange={onChange} />);
        await user.click(screen.getByRole('checkbox', { name: 'Activated' }));
        expect(onChange).toHaveBeenCalledWith(false);
    });

    it('is keyboard-operable: Tab focuses it, Space and Enter toggle', async () => {
        const onChange = vi.fn();
        const user = userEvent.setup();
        render(<M3Checkbox checked={false} label="Activated" onChange={onChange} />);

        await user.tab();
        expect(screen.getByRole('checkbox', { name: 'Activated' })).toHaveFocus();

        await user.keyboard(' ');
        expect(onChange).toHaveBeenNthCalledWith(1, true);

        await user.keyboard('{Enter}');
        expect(onChange).toHaveBeenNthCalledWith(2, true);
    });

    it('is removed from the tab order when disabled', async () => {
        const user = userEvent.setup();
        render(<M3Checkbox checked={false} disabled label="Activated" />);

        await user.tab();
        expect(screen.getByRole('checkbox', { name: 'Activated' })).not.toHaveFocus();
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
