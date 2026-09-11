import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DataTable, DataTableCell, DataTableRow } from './DataTable';
import { DataTableHeader } from './DataTableHeader';

const COLUMNS = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'E-Mail' },
];

describe('DataTable', () => {
    it('renders a semantic table with header and rows', () => {
        render(
            <DataTable ariaLabel="Personen" header={<DataTableHeader columns={COLUMNS} />}>
                <DataTableRow>
                    <DataTableCell>Maria Huber</DataTableCell>
                    <DataTableCell>maria.huber@example.org</DataTableCell>
                </DataTableRow>
            </DataTable>,
        );

        const table = screen.getByRole('table', { name: 'Personen' });
        expect(table).toBeInTheDocument();
        expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
        expect(screen.getByRole('cell', { name: 'maria.huber@example.org' })).toBeInTheDocument();
    });

    it('swaps rows for a skeleton while loading and marks the table busy', () => {
        render(
            <DataTable loading skeletonRows={3} skeletonColumns={2} header={<DataTableHeader columns={COLUMNS} />}>
                <DataTableRow>
                    <DataTableCell>Should not render</DataTableCell>
                </DataTableRow>
            </DataTable>,
        );

        expect(screen.getAllByTestId('data-table-skeleton-row')).toHaveLength(3);
        expect(screen.queryByText('Should not render')).not.toBeInTheDocument();
        expect(screen.getByRole('table')).toHaveAttribute('aria-busy', 'true');
    });

    it('shows the empty slot only when empty and not loading', () => {
        const { rerender } = render(
            <DataTable isEmpty empty={<p>Noch keine Einträge</p>} header={<DataTableHeader columns={COLUMNS} />} />,
        );
        expect(screen.getByText('Noch keine Einträge')).toBeInTheDocument();

        rerender(
            <DataTable
                isEmpty
                loading
                empty={<p>Noch keine Einträge</p>}
                header={<DataTableHeader columns={COLUMNS} />}
            />,
        );
        expect(screen.queryByText('Noch keine Einträge')).not.toBeInTheDocument();
    });

    it('renders the expansion row when a row is expanded', async () => {
        const onClick = vi.fn();
        const { rerender } = render(
            <DataTable>
                <DataTableRow onClick={onClick} expandedContent={<p>Details</p>} expanded={false}>
                    <DataTableCell>Zeile</DataTableCell>
                </DataTableRow>
            </DataTable>,
        );
        expect(screen.queryByText('Details')).not.toBeInTheDocument();

        await userEvent.click(screen.getByText('Zeile'));
        expect(onClick).toHaveBeenCalledTimes(1);

        rerender(
            <DataTable>
                <DataTableRow onClick={onClick} expandedContent={<p>Details</p>} expanded>
                    <DataTableCell>Zeile</DataTableCell>
                </DataTableRow>
            </DataTable>,
        );
        expect(screen.getByText('Details')).toBeInTheDocument();
    });

    it('activates an interactive row from the keyboard as well as the pointer', async () => {
        const user = userEvent.setup();
        const onClick = vi.fn();
        render(
            <DataTable>
                <DataTableRow onClick={onClick} expandedContent={<p>Details</p>}>
                    <DataTableCell>Zeile</DataTableCell>
                </DataTableRow>
            </DataTable>,
        );

        const row = screen.getByRole('row');
        row.focus();
        expect(row).toHaveFocus();

        await user.keyboard('{Enter}');
        expect(onClick).toHaveBeenCalledTimes(1);

        await user.keyboard(' ');
        expect(onClick).toHaveBeenCalledTimes(2);
    });

    it('announces selection through the row control, not an unsupported row state', () => {
        render(
            <DataTable>
                <DataTableRow selected>
                    <DataTableCell>
                        <input type="checkbox" defaultChecked aria-label="Zeile auswählen" />
                    </DataTableCell>
                </DataTableRow>
            </DataTable>,
        );

        // `aria-selected` is not supported on rows of a plain `role="table"`.
        expect(screen.getByRole('row')).not.toHaveAttribute('aria-selected');
        expect(screen.getByRole('checkbox', { name: 'Zeile auswählen' })).toBeChecked();
    });

    it('leaves a non-interactive row out of the tab order', () => {
        render(
            <DataTable>
                <DataTableRow>
                    <DataTableCell>Zeile</DataTableCell>
                </DataTableRow>
            </DataTable>,
        );
        expect(screen.getByRole('row')).not.toHaveAttribute('tabindex');
    });

    it('renders the footer slot', () => {
        render(<DataTable footer={<div>Seite 1 von 2</div>} />);
        expect(screen.getByText('Seite 1 von 2')).toBeInTheDocument();
    });
});
