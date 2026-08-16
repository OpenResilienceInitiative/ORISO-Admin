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
    /** Cycle per click: none → asc → desc → none. */
    onSortChange?: (sort: DataTableSort | null) => void;
    className?: string;
}

const nextSort = (column: DataTableColumn, sort?: DataTableSort | null): DataTableSort | null => {
    if (sort?.key !== column.key) {
        return { key: column.key, direction: 'asc' };
    }
    return sort.direction === 'asc' ? { key: column.key, direction: 'desc' } : null;
};

const ariaSortValue = (column: DataTableColumn, sort?: DataTableSort | null) => {
    if (!column.sortable) {
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
 * carry the matching `aria-sort`; plain columns render text only.
 */
export const DataTableHeader = ({ columns, sort, onSortChange, className }: DataTableHeaderProps) => (
    <thead className={className}>
        <tr>
            {columns.map((column) => (
                <th
                    key={column.key}
                    scope="col"
                    aria-sort={ariaSortValue(column, sort)}
                    style={column.width != null ? { width: column.width } : undefined}
                    className={classNames({
                        [styles.alignCenter]: column.align === 'center',
                        [styles.alignRight]: column.align === 'right',
                    })}
                >
                    {column.sortable ? (
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
            ))}
        </tr>
    </thead>
);
