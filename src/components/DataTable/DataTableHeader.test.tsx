import React from 'react';
import { describe, expect, it, vi } from 'vite-plus/test';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DataTable } from './DataTable';
import { DataTableHeader, DataTableSort } from './DataTableHeader';

const COLUMNS = [
    { key: 'select', ariaLabel: 'Auswahl' },
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

    it('names a label-only column on its semantic header', () => {
        renderHeader(null);

        expect(screen.getByRole('columnheader', { name: 'Auswahl' })).toHaveAttribute('aria-label', 'Auswahl');
        expect(screen.queryByRole('button', { name: 'Auswahl' })).not.toBeInTheDocument();
    });

    describe('sortable column with a non-text label', () => {
        const ICON_COLUMNS = [
            { key: 'status', label: <span aria-hidden="true">●</span>, ariaLabel: 'Status', sortable: true },
        ];

        it('names the sort button from ariaLabel', async () => {
            const user = userEvent.setup();
            const onSortChange = vi.fn();
            render(
                <DataTable
                    header={<DataTableHeader columns={ICON_COLUMNS} sort={null} onSortChange={onSortChange} />}
                />,
            );

            const button = screen.getByRole('button', { name: 'Status' });
            const header = button.closest('th');
            // The name sits on the button only, so it is not announced twice.
            expect(header).not.toHaveAttribute('aria-label');
            expect(header).toHaveAttribute('aria-sort', 'none');
            await user.click(button);
            expect(onSortChange).toHaveBeenCalledWith({ key: 'status', direction: 'asc' });
        });

        it('moves the name to the header when no sort handler is supplied', () => {
            render(<DataTable header={<DataTableHeader columns={ICON_COLUMNS} sort={null} />} />);

            const header = screen.getByRole('columnheader', { name: 'Status' });
            expect(header).toHaveAttribute('aria-label', 'Status');
            expect(header).not.toHaveAttribute('aria-sort');
            expect(screen.queryByRole('button', { name: 'Status' })).not.toBeInTheDocument();
        });
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
