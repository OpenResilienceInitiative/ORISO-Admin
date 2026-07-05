import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { M3Switch } from './index';

describe('M3Switch', () => {
    it('announces its checked state and toggles to the next value', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();

        render(<M3Switch checked={false} label="Enable calls" onChange={onChange} />);

        const toggle = screen.getByRole('switch', { name: 'Enable calls' });
        expect(toggle).toHaveAttribute('aria-checked', 'false');

        await user.click(toggle);

        expect(onChange).toHaveBeenCalledWith(true);
    });

    it('does not call onChange when disabled', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();

        render(<M3Switch checked label="Enable calls" disabled onChange={onChange} />);

        await user.click(screen.getByRole('switch', { name: 'Enable calls' }));

        expect(onChange).not.toHaveBeenCalled();
    });
});
