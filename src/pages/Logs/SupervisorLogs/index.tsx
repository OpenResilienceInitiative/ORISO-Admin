import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ColumnType } from 'antd/lib/table';
import { ListingTable } from '../../../components/ListingTable';
import { useSupervisorLogsData } from '../../../hooks/useSupervisorLogsData';
import { SupervisorLogEntry } from '../../../types/supervisorLogs';

export const SupervisorLogsPage = () => {
    const { t } = useTranslation();
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(20);

    const { data, isLoading } = useSupervisorLogsData({ page, perPage });

    const columns: ColumnType<SupervisorLogEntry>[] = [
        {
            title: t('logs.table.date', 'Datum'),
            dataIndex: 'eventDate',
            key: 'eventDate',
            width: 180,
            render: (value: string) => (value ? new Date(value).toLocaleString() : '-'),
        },
        {
            title: t('logs.table.action', 'Aktion'),
            dataIndex: 'action',
            key: 'action',
            width: 110,
        },
        {
            title: t('logs.table.sessionId', 'Session'),
            dataIndex: 'sessionId',
            key: 'sessionId',
            width: 120,
        },
        {
            title: t('logs.table.supervisor', 'Supervisor'),
            key: 'supervisor',
            render: (_: any, row) => row.supervisorName || row.supervisorUsername || row.supervisorConsultantId,
        },
        {
            title: t('logs.table.actor', 'Hinzugefuegt von'),
            key: 'actor',
            render: (_: any, row) =>
                row.action === 'REMOVED' ? '-' : row.actorName || row.actorUsername || row.actorConsultantId,
        },
        {
            title: t('logs.table.notes', 'Notiz'),
            dataIndex: 'notes',
            key: 'notes',
            ellipsis: true,
        },
    ];

    // Results only: the page chrome (title + tabs) belongs to `LogsTabsLayout`, which renders this
    // page in its Outlet — same contract as the case-handover and inactive-account log pages.
    return (
        <ListingTable<SupervisorLogEntry>
            rowKey={(row) => `${row.relationId}-${row.action}-${row.eventDate}`}
            loading={isLoading}
            columns={columns}
            dataSource={data?.data ?? []}
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
    );
};
