import { Alert, Button, Select, Space, Tag } from 'antd';
import { ColumnType } from 'antd/lib/table';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ListingTable } from '../../../components/ListingTable';
import { GlobalSearchBar } from '../../../components/GlobalSearch';
import { useDeletionAuditLogsData } from '../../../hooks/useDeletionAuditLogsData';
import { DeletionAuditLogEntry } from '../../../types/deletionAuditLogs';

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
    const { t } = useTranslation();
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

    const columns: ColumnType<DeletionAuditLogEntry>[] = useMemo(
        () => [
            {
                title: t('deletionAudit.table.createdAt'),
                dataIndex: 'createDate',
                key: 'createDate',
                width: 180,
                render: (value: string) => (value ? new Date(value).toLocaleString() : '-'),
            },
            {
                title: t('deletionAudit.table.outcome'),
                dataIndex: 'outcome',
                key: 'outcome',
                width: 150,
                render: (value: string) => (
                    <Tag color={outcomeColor[value] ?? 'default'}>{t(`deletionAudit.outcome.${value}`)}</Tag>
                ),
            },
            {
                title: t('deletionAudit.table.targetType'),
                dataIndex: 'targetType',
                key: 'targetType',
                width: 170,
                render: (value: string) => t(`deletionAudit.targetType.${value}`),
            },
            {
                title: t('deletionAudit.table.targetId'),
                dataIndex: 'targetId',
                key: 'targetId',
                width: 280,
            },
            {
                title: t('deletionAudit.table.tenantId'),
                dataIndex: 'tenantId',
                key: 'tenantId',
                width: 110,
                render: (value: number | null | undefined) => value ?? '-',
            },
            {
                title: t('deletionAudit.table.actorRole'),
                dataIndex: 'actorRole',
                key: 'actorRole',
                width: 170,
                render: (value: string) => t(`deletionAudit.actor.${value}`, { defaultValue: value }),
            },
            {
                title: t('deletionAudit.table.actorId'),
                dataIndex: 'actorId',
                key: 'actorId',
                width: 280,
                render: (value: string | null | undefined) => value || '-',
            },
        ],
        [t],
    );

    return (
        <>
            {isError && <Alert type="error" message={t('error.loading')} showIcon />}
            <Space style={{ marginBottom: 16 }} wrap>
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
                    {t('btn.cancel')}
                </Button>
            </Space>

            <ListingTable<DeletionAuditLogEntry>
                rowKey={(row) => `${row.id}`}
                loading={isLoading}
                columns={columns}
                dataSource={data?.data ?? []}
                scroll={{ x: 1300 }}
                pagination={{
                    current: page,
                    pageSize: perPage,
                    total: data?.total ?? 0,
                    showSizeChanger: true,
                    onChange: (nextPage, nextPageSize) => {
                        setPage(nextPage);
                        if (nextPageSize && nextPageSize !== perPage) {
                            setPerPage(nextPageSize);
                            setPage(1);
                        }
                    },
                }}
            />
        </>
    );
};
