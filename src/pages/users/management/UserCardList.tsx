import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AdminEmpty } from '../../../components/AdminEmpty';
import { LoadMoreFooter } from '../../../components/UserTable/LoadMoreFooter';
import { UserCard } from '../../../components/UserTable/UserCard';
import type { CounselorData } from '../../../types/counselor';
import { resolveDisplayStatus } from '../../../types/userDisplayStatus';
import { appendPage, displayName, displayUsername } from './userRows';
import styles from './userDataTable.module.scss';

export interface UserCardListProps {
    rows: CounselorData[];
    loading: boolean;
    page: number;
    total: number;
    onLoadMore: () => void;
    onEdit?: (row: CounselorData) => void;
    onDelete?: (row: CounselorData) => void;
    details: (row: CounselorData) => ReactNode;
    ariaLabel?: string;
}

type Pages = Record<number, CounselorData[]>;

/**
 * Phone list: page 1 replaces, later pages are appended. Pages are kept by number, so a
 * refetch (e.g. after a delete) replaces its own page instead of appending to it.
 */
export const UserCardList = ({
    rows,
    loading,
    page,
    total,
    onLoadMore,
    onEdit,
    onDelete,
    details,
    ariaLabel,
}: UserCardListProps) => {
    const [pages, setPages] = useState<Pages>({ [page]: rows });

    useEffect(() => {
        if (loading) return;
        setPages((current) => {
            if (current[page] === rows) return current;
            return page > 1 ? { ...current, [page]: rows } : { 1: rows };
        });
    }, [rows, page, loading]);

    const shown = useMemo(
        () =>
            Object.keys(pages)
                .map(Number)
                .sort((a, b) => a - b)
                .reduce<CounselorData[]>((list, number) => appendPage(list, pages[number]), []),
        [pages],
    );

    if (!loading && shown.length === 0) return <AdminEmpty />;

    return (
        <section className={styles.cards} aria-label={ariaLabel} aria-busy={loading || undefined}>
            {shown.map((row) => {
                const pending = row.status === 'IN_DELETION';
                return (
                    <UserCard
                        key={row.id}
                        name={displayName(row)}
                        email={row.email}
                        username={row.username && displayUsername(row.username)}
                        status={resolveDisplayStatus(row)}
                        actionsDisabled={pending}
                        onEdit={onEdit && (() => onEdit(row))}
                        onDelete={onDelete && (() => onDelete(row))}
                    >
                        {details(row)}
                    </UserCard>
                );
            })}
            {shown.length > 0 && (
                <LoadMoreFooter shown={shown.length} total={total} loading={loading} onLoadMore={onLoadMore} />
            )}
        </section>
    );
};
