import React from 'react';
import { describe, expect, it, vi } from 'vite-plus/test';
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

    it('uses a neutral outlined track and a dark knob when checked and disabled', () => {
        const { container } = render(<M3Switch checked disabled label="Enable calls" />);

        expect(container.querySelector('rect[width="52"]')).toHaveAttribute(
            'fill',
            'var(--m3-surface-container-highest, #E4E2E2)',
        );
        expect(container.querySelector('rect[width="50"]')).toHaveAttribute('stroke', 'var(--m3-outline, #747878)');
        const thumb = container.querySelector('rect[width="24"]');
        expect(thumb).toHaveAttribute('x', '28');
        expect(thumb).toHaveAttribute('fill', 'var(--m3-on-surface-variant, #444748)');
        expect(screen.getByRole('switch', { name: 'Enable calls' })).toBeDisabled();
    });

    // #1374: the off state must read as a switch on a light tile (WCAG 1.4.11):
    // full-strength 2px outline, a dark knob and a contrasting ✕ — no faded fills.
    it('draws the off state with a 2px outline, a dark knob and a light ✕', () => {
        const { container } = render(<M3Switch checked={false} label="Enable calls" />);

        const track = container.querySelector('rect[width="52"]');
        expect(track).toHaveAttribute('fill', 'var(--m3-surface-container-highest, #E4E2E2)');
        expect(track).not.toHaveAttribute('fill-opacity');

        const outline = container.querySelector('rect[width="50"]');
        expect(outline).toHaveAttribute('stroke', 'var(--m3-outline, #747878)');
        expect(outline).toHaveAttribute('stroke-width', '2');
        expect(outline).not.toHaveAttribute('stroke-opacity');

        const thumb = container.querySelector('rect[width="24"]');
        expect(thumb).toHaveAttribute('fill', 'var(--m3-on-surface-variant, #444748)');
        expect(thumb).not.toHaveAttribute('fill-opacity');

        expect(container.querySelector('path')).toHaveAttribute('fill', 'var(--m3-surface-container-highest, #E4E2E2)');
    });

    it('centres the knob vertically in the track in both states', () => {
        [false, true].forEach((checked) => {
            const { container, unmount } = render(<M3Switch checked={checked} label="Enable calls" />);
            const track = container.querySelector('rect[width="52"]')!;
            const thumb = container.querySelector('rect[width="24"]')!;
            const trackMid = Number(track.getAttribute('y')) + Number(track.getAttribute('height')) / 2;
            const thumbMid = Number(thumb.getAttribute('y')) + Number(thumb.getAttribute('height')) / 2;

            expect(thumbMid).toBe(trackMid);
            unmount();
        });
    });
});
