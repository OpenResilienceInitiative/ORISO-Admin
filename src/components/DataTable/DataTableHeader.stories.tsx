import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { DataTable, DataTableCell, DataTableRow } from './DataTable';
import { DataTableHeader, DataTableSort } from './DataTableHeader';

/**
 * Column header row for `DataTable`. Sortable columns render as buttons with
 * `aria-sort` and cycle ascending → descending → unsorted; alignment and fixed
 * widths come from the column definition.
 */
const meta = {
    title: 'Molecules/DataTable/Header',
    component: DataTableHeader,
    parameters: { layout: 'padded' },
} satisfies Meta<typeof DataTableHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

const ROWS = [
    { name: 'Maria Huber', open: 12, updated: '05.08.2026' },
    { name: 'Jan Petersen', open: 4, updated: '11.08.2026' },
    { name: 'Ayşe Demir', open: 9, updated: '02.08.2026' },
];

const HeaderPlayground = () => {
    const [sort, setSort] = useState<DataTableSort | null>(null);

    return (
        <DataTable
            ariaLabel="Offene Anfragen je Beraterin"
            header={
                <DataTableHeader
                    columns={[
                        { key: 'name', label: 'Name', sortable: true },
                        { key: 'open', label: 'Offene Anfragen', sortable: true, align: 'right', width: 160 },
                        { key: 'updated', label: 'Aktualisiert' },
                    ]}
                    sort={sort}
                    onSortChange={setSort}
                />
            }
        >
            {ROWS.map((row) => (
                <DataTableRow key={row.name}>
                    <DataTableCell>{row.name}</DataTableCell>
                    <DataTableCell align="right">{row.open}</DataTableCell>
                    <DataTableCell>{row.updated}</DataTableCell>
                </DataTableRow>
            ))}
        </DataTable>
    );
};

/** Two sortable columns (one right-aligned), one static column. */
export const SortCycle: Story = {
    args: { columns: [] },
    render: () => <HeaderPlayground />,
};
