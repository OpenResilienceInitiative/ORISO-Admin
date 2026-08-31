import type { ReactNode } from 'react';
import classNames from 'classnames';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import SwapVertIcon from '@mui/icons-material/SwapVert';
import styles from './dataTableHeader.module.scss';

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
    className?: string;
}

const nextSort = (column: DataTableColumn, sort?: DataTableSort | null): DataTableSort | null => {
    if (sort?.key !== column.key) {
        return { key: column.key, direction: 'asc' };
    }
    return sort.direction === 'asc' ? { key: column.key, direction: 'desc' } : null;
};

/**
 * A column is only really sortable when a handler can act on the click. Without
 * `onSortChange` the button would be an affordance that does nothing, so such a
 * column degrades to a plain header (no button, no `aria-sort`).
 */
const isSortable = (column: DataTableColumn, onSortChange?: DataTableHeaderProps['onSortChange']) =>
    column.sortable === true && onSortChange != null;

const ariaSortValue = (column: DataTableColumn, sortable: boolean, sort?: DataTableSort | null) => {
    if (!sortable) {
        return undefined;
    }
    if (sort?.key !== column.key) {
        return 'none' as const;
    }
    return sort.direction === 'asc' ? ('ascending' as const) : ('descending' as const);
};

const SortIcon = ({ column, sort }: { column: DataTableColumn; sort?: DataTableSort | null }) => {
    if (sort?.key !== column.key) {
        return <SwapVertIcon className={classNames(styles.sortIcon, styles.sortIconIdle)} aria-hidden />;
    }
    return sort.direction === 'asc' ? (
        <ArrowUpwardIcon className={styles.sortIcon} aria-hidden />
    ) : (
        <ArrowDownwardIcon className={styles.sortIcon} aria-hidden />
    );
};

/**
 * M3 column header row for {@link import('./DataTable').DataTable}. Sortable
 * columns render their label as a button that cycles asc → desc → unsorted and
 * carry the matching `aria-sort`; plain columns render text only. A `sortable`
 * column without an `onSortChange` handler is rendered as a plain column —
 * a sort button nobody listens to is worse than no button at all.
 */
export const DataTableHeader = ({ columns, sort, onSortChange, className }: DataTableHeaderProps) => (
    <thead className={className}>
        <tr>
            {columns.map((column) => {
                const sortable = isSortable(column, onSortChange);
                return (
                    <th
                        key={column.key}
                        scope="col"
                        aria-sort={ariaSortValue(column, sortable, sort)}
                        style={column.width != null ? { width: column.width } : undefined}
                        className={classNames({
                            [styles.alignCenter]: column.align === 'center',
                            [styles.alignRight]: column.align === 'right',
                        })}
                    >
                        {sortable ? (
                            <button
                                type="button"
                                className={styles.sortButton}
                                aria-label={column.ariaLabel}
                                onClick={() => onSortChange?.(nextSort(column, sort))}
                            >
                                {column.label}
                                <SortIcon column={column} sort={sort} />
                            </button>
                        ) : (
                            <span aria-label={column.ariaLabel}>{column.label}</span>
                        )}
                    </th>
                );
            })}
        </tr>
    </thead>
);
