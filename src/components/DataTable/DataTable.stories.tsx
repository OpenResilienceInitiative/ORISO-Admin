import { useMemo, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { AdminEmpty } from '../AdminEmpty';
import { DataTable, DataTableCell, DataTableRow } from './DataTable';
import { DataTableHeader, DataTableSort } from './DataTableHeader';
import { DataTablePagination } from './DataTablePagination';

/**
 * M3 data-table core: semantic table on the muted admin surface with sticky
 * header support, row hover, expansion slot, loading skeleton and empty slot.
 * Composed with `DataTableHeader` and `DataTablePagination`.
 */
const meta = {
    title: 'Molecules/DataTable/Core',
    component: DataTable,
    parameters: { layout: 'padded' },
} satisfies Meta<typeof DataTable>;

export default meta;
type Story = StoryObj<typeof meta>;

interface Person {
    id: number;
    name: string;
    email: string;
    agency: string;
}

const PEOPLE: Person[] = [
    { id: 1, name: 'Maria Huber', email: 'maria.huber@example.org', agency: 'Beratungsstelle München' },
    { id: 2, name: 'Jan Petersen', email: 'jan.petersen@example.org', agency: 'Beratungsstelle Hamburg' },
    { id: 3, name: 'Ayşe Demir', email: 'ayse.demir@example.org', agency: 'Beratungsstelle Köln' },
    { id: 4, name: 'Thomas Brandt', email: 'thomas.brandt@example.org', agency: 'Beratungsstelle Dresden' },
];

const COLUMNS = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'email', label: 'E-Mail' },
    { key: 'agency', label: 'Beratungsstelle' },
];

const SortableExample = () => {
    const [sort, setSort] = useState<DataTableSort | null>({ key: 'name', direction: 'asc' });
    const rows = useMemo(() => {
        if (!sort) return PEOPLE;
        const factor = sort.direction === 'asc' ? 1 : -1;
        return [...PEOPLE].sort((a, b) => factor * a.name.localeCompare(b.name, 'de'));
    }, [sort]);

    return (
        <DataTable
            ariaLabel="Beraterinnen und Berater"
            stickyHeader
            header={<DataTableHeader columns={COLUMNS} sort={sort} onSortChange={setSort} />}
        >
            {rows.map((person) => (
                <DataTableRow key={person.id}>
                    <DataTableCell>{person.name}</DataTableCell>
                    <DataTableCell>{person.email}</DataTableCell>
                    <DataTableCell>{person.agency}</DataTableCell>
                </DataTableRow>
            ))}
        </DataTable>
    );
};

/** Sortable name column (cycles asc → desc → unsorted), sticky header, hover states. */
export const Sortable: Story = { render: () => <SortableExample /> };

/** Skeleton rows while data loads; the table reports `aria-busy`. */
export const Loading: Story = {
    render: () => (
        <DataTable loading skeletonRows={4} skeletonColumns={3} header={<DataTableHeader columns={COLUMNS} />} />
    ),
};

/** Empty slot below the (still visible) header — headers stay, nothing hides. */
export const Empty: Story = {
    render: () => (
        <DataTable
            isEmpty
            empty={<AdminEmpty description="Noch keine Beraterinnen und Berater" />}
            header={<DataTableHeader columns={COLUMNS} />}
        />
    ),
};

const ExpansionExample = () => {
    const [expandedId, setExpandedId] = useState<number | null>(2);

    return (
        <DataTable ariaLabel="Beraterinnen und Berater" header={<DataTableHeader columns={COLUMNS} />}>
            {PEOPLE.map((person) => (
                <DataTableRow
                    key={person.id}
                    expanded={expandedId === person.id}
                    expansionColSpan={COLUMNS.length}
                    expandedContent={
                        <p style={{ margin: 0 }}>
                            {person.name} betreut aktuell 12 offene Anfragen in der {person.agency}.
                        </p>
                    }
                    onClick={() => setExpandedId((current) => (current === person.id ? null : person.id))}
                >
                    <DataTableCell>{person.name}</DataTableCell>
                    <DataTableCell>{person.email}</DataTableCell>
                    <DataTableCell>{person.agency}</DataTableCell>
                </DataTableRow>
            ))}
        </DataTable>
    );
};

/** Click a row to toggle its expansion slot (keyboard: Enter/Space). */
export const RowExpansion: Story = { render: () => <ExpansionExample /> };

/** Error-tone rows (dead records) carry the quiet magenta error-role wash. */
export const ErrorRows: Story = {
    render: () => (
        <DataTable
            ariaLabel="Beraterinnen und Berater"
            header={<DataTableHeader columns={COLUMNS} />}
            footer={<DataTablePagination page={1} pageSize={10} total={4} onPageChange={() => {}} />}
        >
            {PEOPLE.map((person, index) => (
                <DataTableRow key={person.id} tone={index === 1 ? 'error' : 'default'}>
                    <DataTableCell>{person.name}</DataTableCell>
                    <DataTableCell>{person.email}</DataTableCell>
                    <DataTableCell>{person.agency}</DataTableCell>
                </DataTableRow>
            ))}
        </DataTable>
    ),
};

/** Below 768px, `stackedOnMobile` collapses rows into stacked cards. */
export const StackedOnMobile: Story = {
    globals: { viewport: { value: 'phone', isRotated: false } },
    render: () => (
        <DataTable ariaLabel="Beraterinnen und Berater" stackedOnMobile header={<DataTableHeader columns={COLUMNS} />}>
            {PEOPLE.map((person) => (
                <DataTableRow key={person.id}>
                    <DataTableCell>{person.name}</DataTableCell>
                    <DataTableCell>{person.email}</DataTableCell>
                    <DataTableCell>{person.agency}</DataTableCell>
                </DataTableRow>
            ))}
        </DataTable>
    ),
};
