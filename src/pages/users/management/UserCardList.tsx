import { useEffect, useState, type ReactNode } from 'react';
import { AdminEmpty } from '../../../components/AdminEmpty';
import { LoadMoreFooter } from '../../../components/UserTable/LoadMoreFooter';
import { UserCard } from '../../../components/UserTable/UserCard';
import type { CounselorData } from '../../../types/counselor';
import { resolveDisplayStatus } from '../../../types/userDisplayStatus';
import { appendPage, displayName } from './userRows';
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

const sameRows = (a: CounselorData[], b: CounselorData[]) =>
    a.length === b.length && a.every((row, index) => row === b[index]);

/** Phone list: page 1 replaces, every later page is appended under what is already shown. */
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
    const [shown, setShown] = useState(rows);

    useEffect(() => {
        if (loading) return;
        setShown((current) => {
            if (page > 1) return appendPage(current, rows);
            return sameRows(current, rows) ? current : rows;
        });
    }, [rows, page, loading]);

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
                        username={row.username}
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
