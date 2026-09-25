import type { ReactNode } from 'react';
import { SortHeaderCell } from './SortHeaderCell';

export type DataTableSortDirection = 'asc' | 'desc';

export interface DataTableSort {
    key: string;
    direction: DataTableSortDirection;
}

export interface DataTableColumn {
    key: string;
    label?: ReactNode;
    /** Accessible name when `label` is not plain text (or empty, e.g. a selection column). */
    ariaLabel?: string;
    sortable?: boolean;
    align?: 'left' | 'center' | 'right';
    width?: string | number;
    /** Direction of the first click, e.g. `desc` for "newest first" date columns. */
    firstDirection?: DataTableSortDirection;
    /** Control next to the label inside the header cell, e.g. a sort-field pill. */
    addon?: ReactNode;
}

export interface DataTableHeaderProps {
    columns: DataTableColumn[];
    /** Controlled sort state; `null`/`undefined` = unsorted. */
    sort?: DataTableSort | null;
    /**
     * Cycle per click: none → asc → desc → none. Required for `sortable`
     * columns — without it they render as plain, non-sortable headers.
     */
    onSortChange?: (sort: DataTableSort | null) => void;
    /** Server lists always have an order: clicks toggle asc ↔ desc, never back to unsorted. */
    sortRequired?: boolean;
    className?: string;
}

/**
 * M3 column header row for {@link import('./DataTable').DataTable}. Sortable
 * columns render their label as a button that cycles asc → desc → unsorted and
 * carry the matching `aria-sort`; plain columns render text only. A `sortable`
 * column without an `onSortChange` handler is rendered as a plain column —
 * a sort button nobody listens to is worse than no button at all.
 */
export const DataTableHeader = ({ columns, sort, onSortChange, sortRequired, className }: DataTableHeaderProps) => (
    <thead className={className}>
        <tr>
            {columns.map((column) => (
                <SortHeaderCell
                    key={column.key}
                    column={column}
                    sort={sort}
                    onSortChange={onSortChange}
                    sortRequired={sortRequired}
                />
            ))}
        </tr>
    </thead>
);
