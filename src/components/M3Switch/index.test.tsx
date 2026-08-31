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

    it('uses the primary selected-state token for its enabled checked track', () => {
        const { container } = render(<M3Switch checked label="Enable calls" />);

        expect(container.querySelector('rect[width="52"]')).toHaveAttribute(
            'fill',
            'var(--admin-control-selected, var(--m3-primary, #A5000A))',
        );
    });

    it('uses a grey track and grey thumb when checked and disabled', () => {
        const { container } = render(<M3Switch checked disabled label="Enable calls" />);

        expect(container.querySelector('rect[width="52"]')).toHaveAttribute(
            'fill',
            'var(--m3-surface-variant, #E0E3E3)',
        );
        expect(container.querySelector('rect[width="24"]')).toHaveAttribute(
            'fill',
            'var(--admin-form-muted-text, var(--m3-on-surface-variant, #444748))',
        );
        expect(container.querySelector('rect[width="24"]')).toHaveAttribute('fill-opacity', '0.5');
    });

    it('keeps the original grey thumb appearance when off', () => {
        const { container } = render(<M3Switch checked={false} label="Enable calls" />);

        expect(container.querySelector('rect[width="24"]')).toHaveAttribute(
            'fill',
            'var(--admin-form-muted-text, var(--m3-on-surface-variant, #444748))',
        );
        expect(container.querySelector('rect[width="24"]')).toHaveAttribute('fill-opacity', '0.5');
    });
});
