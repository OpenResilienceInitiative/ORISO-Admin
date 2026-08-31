import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import classNames from 'classnames';
import { IconButton } from '../IconButton';
import styles from './dataTablePagination.module.scss';

export interface DataTablePaginationProps {
    /** 1-based current page. */
    page: number;
    pageSize: number;
    total: number;
    pageSizeOptions?: number[];
    onPageChange: (page: number) => void;
    /** Omit to hide the rows-per-page select. Callers reset `page` themselves. */
    onPageSizeChange?: (pageSize: number) => void;
    disabled?: boolean;
    className?: string;
}

/**
 * M3 table pagination footer: rows-per-page select, "x–y von z" range and
 * previous/next icon buttons. Buttons at the range bounds are disabled, not
 * hidden. Meant for the `footer` slot of {@link import('./DataTable').DataTable}.
 */
export const DataTablePagination = ({
    page,
    pageSize,
    total,
    pageSizeOptions = [10, 20, 30],
    onPageChange,
    onPageSizeChange,
    disabled = false,
    className,
}: DataTablePaginationProps) => {
    const { t } = useTranslation();
    const selectId = useId();
    const pageCount = Math.max(1, Math.ceil(total / pageSize));
    // Filtering or a deletion can shrink `total` under a page the caller still
    // holds. Rendering that page verbatim produces nonsense like "21–4 von 4"
    // and re-enables "previous" past the end, so the range and the navigation
    // bounds are computed from the clamped page.
    const safePage = Math.min(Math.max(1, page), pageCount);
    const from = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
    const to = Math.min(total, safePage * pageSize);

    return (
        <div className={classNames(styles.pagination, className)}>
            {onPageSizeChange && (
                <label className={styles.pageSize} htmlFor={selectId}>
                    <span className={styles.pageSizeLabel}>
                        {t('dataTable.pagination.rowsPerPage', 'Zeilen pro Seite')}
                    </span>
                    <select
                        id={selectId}
                        className={styles.pageSizeSelect}
                        value={pageSize}
                        disabled={disabled}
                        onChange={(event) => onPageSizeChange(Number(event.target.value))}
                    >
                        {pageSizeOptions.map((option) => (
                            <option key={option} value={option}>
                                {option}
                            </option>
                        ))}
                    </select>
                </label>
            )}
            <span className={styles.range} aria-live="polite">
                {t('dataTable.pagination.range', '{{from}}–{{to}} von {{total}}', { from, to, total })}
            </span>
            <div className={styles.nav}>
                <IconButton
                    icon={<ChevronLeftIcon />}
                    ariaLabel={t('dataTable.pagination.previous', 'Vorherige Seite')}
                    disabled={disabled || safePage <= 1}
                    onClick={() => onPageChange(safePage - 1)}
                />
                <IconButton
                    icon={<ChevronRightIcon />}
                    ariaLabel={t('dataTable.pagination.next', 'Nächste Seite')}
                    disabled={disabled || safePage >= pageCount}
                    onClick={() => onPageChange(safePage + 1)}
                />
            </div>
        </div>
    );
};
