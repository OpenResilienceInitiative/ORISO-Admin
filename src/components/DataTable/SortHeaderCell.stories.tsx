import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- SB10 subpath export, invisible to the eslint import resolver
import { expect } from 'storybook/test';
import { DataTable, DataTableCell, DataTableRow } from './DataTable';
import { DataTableHeader, type DataTableColumn, type DataTableSort } from './DataTableHeader';
import { SortHeaderCell } from './SortHeaderCell';

/**
 * One header cell of `DataTableHeader`. Only server-sortable columns get the
 * sort button and the arrow; with `sortRequired` a server list never drops back
 * to "unsorted" and date columns can open newest first (`firstDirection`).
 */
const meta = {
    title: 'Molecules/DataTable/SortHeaderCell',
    component: SortHeaderCell,
    parameters: { layout: 'padded' },
} satisfies Meta<typeof SortHeaderCell>;

export default meta;
type Story = StoryObj<typeof meta>;

const COLUMNS: DataTableColumn[] = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'tenant', label: 'Träger', sortable: true },
    { key: 'status', label: 'Status' },
    { key: 'updated', label: 'Zuletzt aktualisiert', sortable: true, firstDirection: 'desc' },
];

const ServerHeader = () => {
    const [sort, setSort] = useState<DataTableSort | null>({ key: 'updated', direction: 'desc' });

    return (
        <DataTable
            ariaLabel="Beratende"
            header={<DataTableHeader columns={COLUMNS} sort={sort} onSortChange={setSort} sortRequired />}
        >
            <DataTableRow>
                <DataTableCell>Maria Huber</DataTableCell>
                <DataTableCell>Caritas Berlin</DataTableCell>
                <DataTableCell>Aktiv</DataTableCell>
                <DataTableCell>vor 3 Tagen</DataTableCell>
            </DataTableRow>
        </DataTable>
    );
};

/** Server list: status is not server-sortable, so it gets no arrow and no `aria-sort`. */
export const ServerSortable: Story = {
    args: { column: COLUMNS[0] },
    render: () => <ServerHeader />,
    play: async ({ canvas, userEvent }) => {
        const header = (name: string) => canvas.getByRole('columnheader', { name: new RegExp(name) });

        await expect(header('Status')).not.toHaveAttribute('aria-sort');
        await expect(canvas.queryByRole('button', { name: /Status/ })).toBeNull();
        await expect(header('Zuletzt')).toHaveAttribute('aria-sort', 'descending');
        await expect(header('Name')).toHaveAttribute('aria-sort', 'none');

        await userEvent.click(canvas.getByRole('button', { name: /Name/ }));
        await expect(header('Name')).toHaveAttribute('aria-sort', 'ascending');
        await expect(header('Zuletzt')).toHaveAttribute('aria-sort', 'none');

        await userEvent.click(canvas.getByRole('button', { name: /Name/ }));
        await expect(header('Name')).toHaveAttribute('aria-sort', 'descending');

        // Required sort: a third click flips back instead of clearing.
        await userEvent.click(canvas.getByRole('button', { name: /Name/ }));
        await expect(header('Name')).toHaveAttribute('aria-sort', 'ascending');

        // Date columns open newest first.
        await userEvent.click(canvas.getByRole('button', { name: /Zuletzt/ }));
        await expect(header('Zuletzt')).toHaveAttribute('aria-sort', 'descending');
    },
};
