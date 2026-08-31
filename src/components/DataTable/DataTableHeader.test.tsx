import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DataTable } from './DataTable';
import { DataTableHeader, DataTableSort } from './DataTableHeader';

const COLUMNS = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'invitedAt', label: 'Eingeladen am' },
];

const renderHeader = (sort: DataTableSort | null, onSortChange = vi.fn()) => {
    render(<DataTable header={<DataTableHeader columns={COLUMNS} sort={sort} onSortChange={onSortChange} />} />);
    return onSortChange;
};

describe('DataTableHeader', () => {
    it('exposes aria-sort on sortable columns only', () => {
        renderHeader({ key: 'name', direction: 'asc' });

        expect(screen.getByRole('columnheader', { name: 'Name' })).toHaveAttribute('aria-sort', 'ascending');
        expect(screen.getByRole('columnheader', { name: 'Eingeladen am' })).not.toHaveAttribute('aria-sort');
    });

    it('reports descending state', () => {
        renderHeader({ key: 'name', direction: 'desc' });
        expect(screen.getByRole('columnheader', { name: 'Name' })).toHaveAttribute('aria-sort', 'descending');
    });

    it('cycles unsorted → ascending → descending → unsorted', async () => {
        const user = userEvent.setup();

        const fromNone = renderHeader(null);
        await user.click(screen.getByRole('button', { name: 'Name' }));
        expect(fromNone).toHaveBeenCalledWith({ key: 'name', direction: 'asc' });
    });

    it('moves from ascending to descending and then clears', async () => {
        const user = userEvent.setup();

        const fromAsc = renderHeader({ key: 'name', direction: 'asc' });
        await user.click(screen.getByRole('button', { name: 'Name' }));
        expect(fromAsc).toHaveBeenCalledWith({ key: 'name', direction: 'desc' });
    });

    it('clears the sort after descending', async () => {
        const user = userEvent.setup();

        const fromDesc = renderHeader({ key: 'name', direction: 'desc' });
        await user.click(screen.getByRole('button', { name: 'Name' }));
        expect(fromDesc).toHaveBeenCalledWith(null);
    });

    it('does not render a button for non-sortable columns', () => {
        renderHeader(null);
        expect(screen.queryByRole('button', { name: 'Eingeladen am' })).not.toBeInTheDocument();
    });

    it('drops the sort affordance when no handler can act on it', () => {
        // A sortable column without `onSortChange` used to render an active
        // button (and claim `aria-sort`) that did nothing when clicked.
        render(<DataTable header={<DataTableHeader columns={COLUMNS} sort={{ key: 'name', direction: 'asc' }} />} />);

        expect(screen.queryByRole('button', { name: 'Name' })).not.toBeInTheDocument();
        expect(screen.getByRole('columnheader', { name: 'Name' })).not.toHaveAttribute('aria-sort');
    });
});
