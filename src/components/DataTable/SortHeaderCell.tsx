import classNames from 'classnames';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import SwapVertIcon from '@mui/icons-material/SwapVert';
import type { DataTableColumn, DataTableSort, DataTableSortDirection } from './DataTableHeader';
import styles from './dataTableHeader.module.scss';

export interface SortHeaderCellProps {
    column: DataTableColumn;
    sort?: DataTableSort | null;
    /** Without it a `sortable` column renders as a plain header. */
    onSortChange?: (sort: DataTableSort | null) => void;
    /** Server lists always have an order: toggle asc ↔ desc, never back to unsorted. */
    sortRequired?: boolean;
}

const flip = (direction: DataTableSortDirection): DataTableSortDirection => (direction === 'asc' ? 'desc' : 'asc');

const nextSort = (
    column: DataTableColumn,
    sort: DataTableSort | null | undefined,
    required: boolean,
): DataTableSort | null => {
    const first = column.firstDirection ?? 'asc';
    if (sort?.key !== column.key) {
        return { key: column.key, direction: first };
    }
    if (!required && sort.direction !== first) {
        return null;
    }
    return { key: column.key, direction: flip(sort.direction) };
};

const ariaSortValue = (column: DataTableColumn, sort?: DataTableSort | null) => {
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
 * One `<th>`. Only a column the server can sort (`sortable` + a handler) gets
 * the button, the arrow and `aria-sort`; every other column is plain text.
 */
export const SortHeaderCell = ({ column, sort, onSortChange, sortRequired = false }: SortHeaderCellProps) => {
    const sortable = column.sortable === true && onSortChange != null;
    return (
        <th
            scope="col"
            aria-sort={sortable ? ariaSortValue(column, sort) : undefined}
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
                    onClick={() => onSortChange?.(nextSort(column, sort, sortRequired))}
                >
                    {column.label}
                    <SortIcon column={column} sort={sort} />
                </button>
            ) : (
                <span aria-label={column.ariaLabel}>{column.label}</span>
            )}
            {column.addon}
        </th>
    );
};
