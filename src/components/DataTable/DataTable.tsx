import type { KeyboardEvent, ReactNode } from 'react';
import classNames from 'classnames';
import styles from './dataTable.module.scss';

/**
 * M3 data table core (Figma Admin.ORISO table language). A semantic `<table>`
 * on the muted admin-table surface: comfortable density, optional sticky
 * header, row hover, loading skeleton, an empty-state slot and a footer slot
 * for {@link import('./DataTablePagination').DataTablePagination}.
 *
 * Composition: pass a {@link import('./DataTableHeader').DataTableHeader} as
 * `header` and {@link DataTableRow}s as children — the core wraps them in
 * `<tbody>` and swaps them for a skeleton while `loading`.
 *
 * With `stackedOnMobile`, rows collapse into stacked cards below 768px (the
 * app-wide mobile breakpoint); the header row stays screen-reader-only.
 */
export interface DataTableProps {
    /** Usually a `DataTableHeader`; rendered verbatim inside the `<table>`. */
    header?: ReactNode;
    /** `DataTableRow`s (or plain `<tr>`s). */
    children?: ReactNode;
    loading?: boolean;
    /** Skeleton geometry while `loading`. */
    skeletonRows?: number;
    skeletonColumns?: number;
    /** When true (and not loading), the `empty` slot renders under the table. */
    isEmpty?: boolean;
    empty?: ReactNode;
    stickyHeader?: boolean;
    stackedOnMobile?: boolean;
    /** Footer slot inside the card, e.g. a `DataTablePagination`. */
    footer?: ReactNode;
    /** Accessible name of the table. */
    ariaLabel?: string;
    className?: string;
}

export const DataTable = ({
    header,
    children,
    loading = false,
    skeletonRows = 5,
    skeletonColumns = 4,
    isEmpty = false,
    empty,
    stickyHeader = false,
    stackedOnMobile = false,
    footer,
    ariaLabel,
    className,
}: DataTableProps) => (
    <div className={classNames(styles.surface, { [styles.stacked]: stackedOnMobile }, className)}>
        <div className={classNames(styles.scroll, { [styles.stickyHeader]: stickyHeader })}>
            <table className={styles.table} aria-label={ariaLabel} aria-busy={loading || undefined}>
                {header}
                <tbody>
                    {loading
                        ? Array.from({ length: skeletonRows }, (_, rowIndex) => (
                              // eslint-disable-next-line react/no-array-index-key -- purely presentational placeholders
                              <tr key={rowIndex} className={styles.skeletonRow} data-testid="data-table-skeleton-row">
                                  {Array.from({ length: skeletonColumns }, (__, columnIndex) => (
                                      // eslint-disable-next-line react/no-array-index-key
                                      <td key={columnIndex}>
                                          <span className={styles.skeletonBar} aria-hidden />
                                      </td>
                                  ))}
                              </tr>
                          ))
                        : children}
                </tbody>
            </table>
        </div>
        {!loading && isEmpty && <div className={styles.empty}>{empty}</div>}
        {footer && <div className={styles.footer}>{footer}</div>}
    </div>
);

export interface DataTableRowProps {
    children: ReactNode;
    /** `error` = dead-record treatment: the magenta error-role wash. */
    tone?: 'default' | 'error';
    /**
     * Visual selection treatment only. The row carries no `aria-selected`:
     * rows of a plain `role="table"` do not support that state (only `grid`
     * and `treegrid` rows do), so screen readers ignore or misreport it.
     * Selection must be announced by the control that also toggles it — the
     * row's own checkbox, which is what `InviteProgressBoard` renders.
     */
    selected?: boolean;
    /** Extra content rendered as a full-width expansion row below this one. */
    expandedContent?: ReactNode;
    expanded?: boolean;
    /** Column count the expansion row spans (browsers clamp the default). */
    expansionColSpan?: number;
    onClick?: () => void;
    className?: string;
}

export const DataTableRow = ({
    children,
    tone = 'default',
    selected = false,
    expandedContent,
    expanded = false,
    expansionColSpan = 100,
    onClick,
    className,
}: DataTableRowProps) => {
    const interactive = onClick != null;
    const onKeyDown = (event: KeyboardEvent<HTMLTableRowElement>) => {
        if (interactive && (event.key === 'Enter' || event.key === ' ') && event.target === event.currentTarget) {
            event.preventDefault();
            onClick();
        }
    };

    return (
        <>
            <tr
                className={classNames(
                    styles.row,
                    { [styles.rowError]: tone === 'error', [styles.rowSelected]: selected },
                    className,
                )}
                tabIndex={interactive ? 0 : undefined}
                onClick={onClick}
                onKeyDown={interactive ? onKeyDown : undefined}
            >
                {children}
            </tr>
            {expanded && expandedContent != null && (
                <tr className={styles.expansionRow}>
                    <td colSpan={expansionColSpan}>{expandedContent}</td>
                </tr>
            )}
        </>
    );
};

export interface DataTableCellProps {
    children?: ReactNode;
    align?: 'left' | 'center' | 'right';
    colSpan?: number;
    className?: string;
}

export const DataTableCell = ({ children, align = 'left', colSpan, className }: DataTableCellProps) => (
    <td
        colSpan={colSpan}
        className={classNames(
            { [styles.alignCenter]: align === 'center', [styles.alignRight]: align === 'right' },
            className,
        )}
    >
        {children}
    </td>
);
