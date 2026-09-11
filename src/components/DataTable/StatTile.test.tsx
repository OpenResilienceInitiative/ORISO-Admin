import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StatTile } from './StatTile';

describe('StatTile', () => {
    it('renders value and label as plain content without a handler', () => {
        render(<StatTile label="Eingeladen" value={12} />);

        expect(screen.getByText('12')).toBeInTheDocument();
        expect(screen.getByText('Eingeladen')).toBeInTheDocument();
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('becomes a pressable filter toggle with a handler', async () => {
        const user = userEvent.setup();
        const onClick = vi.fn();
        render(<StatTile label="Abgelaufen / Problem" value={3} tone="error" onClick={onClick} />);

        const tile = screen.getByRole('button', { name: '3 Abgelaufen / Problem' });
        expect(tile).toHaveAttribute('aria-pressed', 'false');
        await user.click(tile);
        expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('reflects the active filter state via aria-pressed', () => {
        render(<StatTile label="Abgeschlossen" value={5} active onClick={() => {}} />);
        expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
    });

    it('stays visible but inert when disabled (disable, never hide)', () => {
        render(<StatTile label="Eingeladen" value={0} disabled onClick={() => {}} />);
        expect(screen.getByRole('button')).toBeDisabled();
    });
});
