import { Alert, Tag } from 'antd';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ColumnType } from 'antd/lib/table';
import { ListingTable } from '../../../components/ListingTable';
import { useCaseHandoverLogsData } from '../../../hooks/useCaseHandoverLogsData';
import { CaseHandoverLogEntry } from '../../../types/caseHandoverLogs';

const statusColor = (status: string) => {
    switch (status) {
        case 'GRANTED':
            return 'green';
        case 'PENDING':
        case 'PENDING_CLIENT_CONSENT':
            return 'gold';
        case 'DENIED':
        case 'CLIENT_CONSENT_DECLINED':
            return 'red';
        default:
            return 'default';
    }
};

/** Results only: the audit trail of case-handover requests (who, when, reason,
 *  outcome — 2026-07-04 decision, see ORISO-UserService/CONTEXT.md). The reason
 *  policies are configured under Einstellungen → Berechtigungen. */
export const CaseHandoverLogsPage = () => {
    const { t } = useTranslation();
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(20);
    const { data, isLoading, isError: isLogsError } = useCaseHandoverLogsData({ page, perPage });

    const columns: ColumnType<CaseHandoverLogEntry>[] = useMemo(
        () => [
            {
                title: t('caseHandoverLogs.table.createdAt'),
                dataIndex: 'createdAt',
                key: 'createdAt',
                width: 180,
                render: (value: string) => (value ? new Date(value).toLocaleString() : '-'),
            },
            {
                title: t('caseHandoverLogs.table.status'),
                dataIndex: 'status',
                key: 'status',
                width: 180,
                render: (value: string) => <Tag color={statusColor(value)}>{value}</Tag>,
            },
            {
                title: t('caseHandoverLogs.table.sessionId'),
                dataIndex: 'sessionId',
                key: 'sessionId',
                width: 110,
            },
            {
                title: t('caseHandoverLogs.table.requester'),
                key: 'requester',
                width: 220,
                render: (_: any, row) => row.requesterName || row.requesterUsername || row.requesterConsultantId,
            },
            {
                title: t('caseHandoverLogs.table.previous'),
                key: 'previous',
                width: 220,
                render: (_: any, row) => row.previousName || row.previousUsername || row.previousConsultantId || '-',
            },
            {
                title: t('caseHandoverLogs.table.reason'),
                dataIndex: 'reasonLabel',
                key: 'reasonLabel',
                width: 240,
            },
            {
                title: t('caseHandoverLogs.table.auditOutcome'),
                dataIndex: 'auditOutcome',
                key: 'auditOutcome',
            },
        ],
        [t],
    );

    return (
        <>
            {isLogsError && <Alert type="error" message={t('error.loading')} showIcon />}
            <ListingTable<CaseHandoverLogEntry>
                rowKey={(row) => `${row.requestId}`}
                loading={isLoading}
                columns={columns}
                dataSource={data?.data ?? []}
                scroll={{ x: 1200 }}
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
