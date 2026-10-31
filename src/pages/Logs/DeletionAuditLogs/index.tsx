import { Alert, Button, Select, Tag } from 'antd';
import classNames from 'classnames';
import { useRef, useState } from 'react';
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
import { GlobalSearchBar } from '../../../components/GlobalSearch';
import { useDeletionAuditLogsData } from '../../../hooks/useDeletionAuditLogsData';
import { DeletionAuditLogEntry } from '../../../types/deletionAuditLogs';
import { useDeletionLogLayout } from './useDeletionLogLayout';
import styles from './deletionAuditLogs.module.scss';

const TARGET_TYPES = ['CONSULTANT', 'AGENCY_ADMIN', 'TENANT_ADMIN', 'AGENCY', 'TENANT'];
const OUTCOMES = ['SCHEDULED', 'EXECUTED', 'CANCELLED'];

// Outcome is also spelled out in the tag text, so colour is never the only signal.
const outcomeColor: Record<string, string> = {
    SCHEDULED: 'gold',
    EXECUTED: 'red',
    CANCELLED: 'green',
};

/**
 * Deletion log (OBP 2.1 #130): who deleted which counsellor, admin, agency or tenant, when, and
 * what became of it. Ids and role/type labels only — the backend keeps no names or e-mails here.
 */
export const DeletionAuditLogsPage = () => {
    const { t, i18n } = useTranslation();
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(20);
    const [targetType, setTargetType] = useState<string | undefined>(undefined);
    const [outcome, setOutcome] = useState<string | undefined>(undefined);
    const [targetIdInput, setTargetIdInput] = useState('');
    const [targetIdFilter, setTargetIdFilter] = useState('');

    const { data, isLoading, isError } = useDeletionAuditLogsData({
        page,
        perPage,
        targetType,
        outcome,
        targetId: targetIdFilter,
    });

    const containerRef = useRef<HTMLDivElement>(null);
    const layout = useDeletionLogLayout(containerRef);
    const combined = layout !== 'wide';

    const typeLabel = (value: string) => t(`deletionAudit.targetType.${value}`, { defaultValue: value });
    const actorLabel = (value: string) => t(`deletionAudit.actor.${value}`, { defaultValue: value });

    // Wide keeps one column per field. Narrower containers fold type into the target and role into the
    // actor first (rule 2), so the table only gives way to cards once five columns no longer fit.
    const columns: DataTableColumn[] = [
        { key: 'createDate', label: t('deletionAudit.table.createdAt') },
        { key: 'outcome', label: t('deletionAudit.table.outcome') },
        ...(combined
            ? [{ key: 'target', label: t('deletionAudit.table.target') }]
            : [
                  { key: 'targetType', label: t('deletionAudit.table.targetType') },
                  { key: 'targetId', label: t('deletionAudit.table.targetId') },
              ]),
        { key: 'tenantId', label: t('deletionAudit.table.tenantId') },
        ...(combined
            ? [{ key: 'actor', label: t('deletionAudit.table.actor') }]
            : [
                  { key: 'actorRole', label: t('deletionAudit.table.actorRole') },
                  { key: 'actorId', label: t('deletionAudit.table.actorId') },
              ]),
    ];

    const renderCell = (key: string, row: DeletionAuditLogEntry) => {
        switch (key) {
            case 'createDate':
                return (
                    <span className={styles.nowrap}>
                        {row.createDate ? new Date(row.createDate).toLocaleString(i18n.language) : '-'}
                    </span>
                );
            case 'outcome':
                return (
                    <Tag color={outcomeColor[row.outcome] ?? 'default'}>
                        {t(`deletionAudit.outcome.${row.outcome}`, { defaultValue: row.outcome })}
                    </Tag>
                );
            case 'target':
                return (
                    <span className={styles.pair}>
                        <span>{typeLabel(row.targetType)}</span>
                        <span className={classNames(styles.id, styles.secondary)}>{row.targetId}</span>
                    </span>
                );
            case 'targetType':
                return typeLabel(row.targetType);
            case 'targetId':
                return <span className={styles.nowrap}>{row.targetId}</span>;
            case 'tenantId':
                return row.tenantId ?? '-';
            case 'actor':
                return (
                    <span className={styles.pair}>
                        <span>{actorLabel(row.actorRole)}</span>
                        <span className={classNames(styles.id, styles.secondary)}>{row.actorId || '-'}</span>
                    </span>
                );
            case 'actorRole':
                return actorLabel(row.actorRole);
            case 'actorId':
                return <span className={styles.nowrap}>{row.actorId || '-'}</span>;
            default:
                return null;
        }
    };
    const rows = data?.data ?? [];

    return (
        <div ref={containerRef} className={styles.list} data-testid="deletion-log" data-layout={layout}>
            {isError && <Alert className={styles.alert} type="error" message={t('error.loading')} showIcon />}
            {/* Chrome leaves a control that is only partly visible where it is; reveal it whole (and its outline). */}
            <div
                className={styles.toolbar}
                onFocus={(event) => event.target.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })}
            >
                <Select
                    allowClear
                    aria-label={t('deletionAudit.filters.targetType')}
                    placeholder={t('deletionAudit.filters.targetType')}
                    style={{ width: 200 }}
                    value={targetType}
                    onChange={(value) => {
                        setTargetType(value);
                        setPage(1);
                    }}
                    options={TARGET_TYPES.map((value) => ({
                        value,
                        label: t(`deletionAudit.targetType.${value}`),
                    }))}
                />
                <Select
                    allowClear
                    aria-label={t('deletionAudit.filters.outcome')}
                    placeholder={t('deletionAudit.filters.outcome')}
                    style={{ width: 180 }}
                    value={outcome}
                    onChange={(value) => {
                        setOutcome(value);
                        setPage(1);
                    }}
                    options={OUTCOMES.map((value) => ({ value, label: t(`deletionAudit.outcome.${value}`) }))}
                />
                <GlobalSearchBar
                    ariaLabel={t('deletionAudit.filters.targetId')}
                    defaultExpanded
                    expandedWidth={320}
                    searchPlaceholder={t('deletionAudit.filters.targetId')}
                    value={targetIdInput}
                    onSearchChange={setTargetIdInput}
                    onSearch={(value) => {
                        setTargetIdFilter(value);
                        setPage(1);
                    }}
                />
                <Button
                    onClick={() => {
                        setTargetType(undefined);
                        setOutcome(undefined);
                        setTargetIdInput('');
                        setTargetIdFilter('');
                        setPage(1);
                    }}
                >
                    {t('deletionAudit.filters.reset')}
                </Button>
            </div>

            <DataTable
                ariaLabel={t('deletionAudit.title')}
                className={classNames(styles.table, {
                    [styles.combined]: layout === 'combined',
                    [styles.cards]: layout === 'cards',
                })}
                stacked={layout === 'cards'}
                header={<DataTableHeader columns={columns} />}
                loading={isLoading}
                skeletonColumns={columns.length}
                isEmpty={!isError && rows.length === 0}
                empty={<AdminEmpty />}
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
