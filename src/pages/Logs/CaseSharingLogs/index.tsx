import classNames from 'classnames';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { AdminEmpty } from '../../../components/AdminEmpty';
import {
    DataTable,
    DataTableCell,
    DataTableHeader,
    DataTablePagination,
    DataTableRow,
    type DataTableColumn,
} from '../../../components/DataTable';
import { Notify } from '../../../components/Notify';
import { Typography } from '../../../components/Typography';
import { FETCH_ERRORS } from '../../../api/fetchData';
import { useCaseSharingLogsData } from '../../../hooks/useCaseSharingLogsData';
import { CaseSharingChangeEntry } from '../../../types/caseSharingLogs';
import { toIntlLocale } from '../../../utils/language';
import styles from './caseSharingLogs.module.scss';

/**
 * Below this list-container width every row becomes a stacked card (docs/responsive-tables.md:
 * measure the container, not the viewport). Estimate for five one-line columns with the longest
 * German labels ("Art der Beratungsstelle", "Fallübergabe → Teamberatung"); not yet browser-measured.
 */
const CASE_SHARING_TABLE_MIN = 780;

const useStackedRows = (container: RefObject<HTMLElement | null>) => {
    const [stacked, setStacked] = useState(
        () =>
            typeof window !== 'undefined' &&
            typeof window.matchMedia === 'function' &&
            window.matchMedia('(max-width: 767px)').matches,
    );

    useEffect(() => {
        const element = container.current;
        if (!element || typeof ResizeObserver === 'undefined') return undefined;
        const observer = new ResizeObserver(([entry]) => {
            const width = entry?.contentRect.width ?? 0;
            if (width > 0) setStacked(width < CASE_SHARING_TABLE_MIN);
        });
        observer.observe(element);
        return () => observer.disconnect();
    }, [container]);

    return stacked;
};

/**
 * Which case sharing model applied in which Beratungsstelle from when to when (ORISO-Frontend#2494).
 * Every case keeps the model it started under; a switch only affects new cases. Read-only, newest first.
 */
export const CaseSharingLogsPage = () => {
    const { t, i18n } = useTranslation();
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(20);
    const { data, isLoading, isError, error } = useCaseSharingLogsData({ page, perPage });

    const containerRef = useRef<HTMLDivElement>(null);
    const stacked = useStackedRows(containerRef);

    const isForbidden = error instanceof Error && error.message === FETCH_ERRORS.FORBIDDEN;
    const modelLabel = (model: string | null | undefined) =>
        model ? t(`caseSharingLogs.model.${model}`, { defaultValue: model }) : '—';

    const columns: DataTableColumn[] = [
        { key: 'changedAt', label: t('caseSharingLogs.table.changedAt') },
        { key: 'agency', label: t('caseSharingLogs.table.agency') },
        { key: 'changedBy', label: t('caseSharingLogs.table.changedBy') },
        { key: 'change', label: t('caseSharingLogs.table.change') },
        { key: 'source', label: t('caseSharingLogs.table.source') },
    ];

    const renderCell = (key: string, row: CaseSharingChangeEntry) => {
        switch (key) {
            case 'changedAt':
                return (
                    <span className={styles.nowrap}>
                        {row.changedAt ? new Date(row.changedAt).toLocaleString(toIntlLocale(i18n.language)) : '—'}
                    </span>
                );
            case 'agency':
                return (
                    <span className={styles.pair}>
                        <span>{row.agencyName || t('caseSharingLogs.agencyFallback', { id: row.agencyId })}</span>
                        <span className={styles.secondary}>ID {row.agencyId}</span>
                    </span>
                );
            case 'changedBy':
                return row.changedBy || t('caseSharingLogs.system');
            case 'change':
                return (
                    <span className={styles.nowrap}>
                        {modelLabel(row.previousModel)} → {modelLabel(row.newModel)}
                    </span>
                );
            case 'source':
                return t(`caseSharingLogs.source.${row.source}`, { defaultValue: row.source });
            default:
                return null;
        }
    };

    const rows = data?.entries ?? [];

    return (
        <div ref={containerRef} id="case-sharing-logs" className={styles.list} data-testid="case-sharing-log">
            {isError && (
                <Notify
                    retry={!isForbidden}
                    jump="case-sharing-logs"
                    quietText={t(isForbidden ? 'caseSharingLogs.error.forbidden' : 'notify.tile.notLoaded')}
                    title={t('notify.title.logs')}
                    severity="error"
                >
                    {t(isForbidden ? 'caseSharingLogs.error.forbidden' : 'error.loading')}
                </Notify>
            )}
            <Typography variant="body-medium" color="var(--m3-on-surface-variant, #444748)" className={styles.intro}>
                {t('caseSharingLogs.intro')}
            </Typography>
            <DataTable
                ariaLabel={t('caseSharingLogs.title')}
                className={classNames(styles.table, { [styles.cards]: stacked })}
                stacked={stacked}
                header={<DataTableHeader columns={columns} />}
                loading={isLoading}
                skeletonColumns={columns.length}
                isEmpty={!isLoading && rows.length === 0}
                empty={
                    <AdminEmpty
                        description={
                            isError
                                ? t(isForbidden ? 'caseSharingLogs.error.forbidden' : 'notify.tile.notLoaded')
                                : t('caseSharingLogs.empty')
                        }
                    />
                }
                footer={
                    <DataTablePagination
                        page={page}
                        pageSize={perPage}
                        total={data?.total ?? 0}
                        onPageChange={setPage}
                        onPageSizeChange={(nextPageSize) => {
                            setPerPage(nextPageSize);
                            setPage(1);
                        }}
                    />
                }
            >
                {rows.map((row) => (
                    <DataTableRow key={row.id}>
                        {columns.map((column) => (
                            <DataTableCell key={column.key}>
                                <span className={styles.cellLabel}>{column.label}</span>
                                {renderCell(column.key, row)}
                            </DataTableCell>
                        ))}
                    </DataTableRow>
                ))}
            </DataTable>
        </div>
    );
};

export default CaseSharingLogsPage;
