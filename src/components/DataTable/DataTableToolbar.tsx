import type { ReactNode } from 'react';
import classNames from 'classnames';
import styles from './dataTableToolbar.module.scss';

export interface DataTableToolbarProps {
    /** Filter chips (e.g. `FilterChip`s); wraps on narrow screens. */
    filters?: ReactNode;
    /** Search field slot. */
    search?: ReactNode;
    /** Right-aligned actions slot. */
    actions?: ReactNode;
    children?: ReactNode;
    className?: string;
}

/**
 * Slot-based toolbar row above a {@link import('./DataTable').DataTable}:
 * filter chips lead, a search field follows, actions sit at the far end.
 * Purely structural — the slots bring their own components.
 */
export const DataTableToolbar = ({ filters, search, actions, children, className }: DataTableToolbarProps) => (
    <div className={classNames(styles.toolbar, className)}>
        {filters && <div className={styles.filters}>{filters}</div>}
        {search && <div className={styles.search}>{search}</div>}
        {actions && <div className={styles.actions}>{actions}</div>}
        {children}
    </div>
);
