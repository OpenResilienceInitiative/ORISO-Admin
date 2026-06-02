import { Button, Input, Select, Space, Tag } from 'antd';
import { ColumnType } from 'antd/lib/table';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ListingTable } from '../../../components/ListingTable';
import { Page } from '../../../components/Page';
import { useInactiveAccountAuditLogsData } from '../../../hooks/useInactiveAccountAuditLogsData';
import { InactiveAccountAuditLogEntry } from '../../../types/inactiveAccountAuditLogs';

const roleColorMap: Record<string, string> = {
    ADMIN: 'purple',
    CONSULTANT: 'blue',
    ASKER: 'green',
};

export const InactiveAccountAuditLogsPage = () => {
    const { t } = useTranslation();
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(20);
    const [accountRole, setAccountRole] = useState<string | undefined>(undefined);
    const [accountIdInput, setAccountIdInput] = useState('');
    const [accountIdFilter, setAccountIdFilter] = useState('');

    const { data, isLoading } = useInactiveAccountAuditLogsData({
        page,
        perPage,
        accountRole,
        accountId: accountIdFilter,
    });

    const columns: ColumnType<InactiveAccountAuditLogEntry>[] = useMemo(
        () => [
            {
                title: t('inactiveAudit.table.createdAt'),
                dataIndex: 'createDate',
                key: 'createDate',
                width: 180,
                render: (value: string) => (value ? new Date(value).toLocaleString() : '-'),
            },
            {
                title: t('inactiveAudit.table.role'),
                dataIndex: 'accountRole',
                key: 'accountRole',
                width: 110,
                render: (value: string) => <Tag color={roleColorMap[value] ?? 'default'}>{value}</Tag>,
            },
            {
                title: t('inactiveAudit.table.accountId'),
                dataIndex: 'accountId',
                key: 'accountId',
                width: 240,
            },
            {
                title: t('inactiveAudit.table.accountTenantId'),
                dataIndex: 'accountTenantId',
                key: 'accountTenantId',
                width: 130,
                render: (value: number | null | undefined) => value ?? '-',
            },
            {
                title: t('inactiveAudit.table.lastActivityAt'),
                dataIndex: 'lastActivityAt',
                key: 'lastActivityAt',
                width: 180,
                render: (value: string | null | undefined) => (value ? new Date(value).toLocaleString() : '-'),
            },
            {
                title: t('inactiveAudit.table.thresholdDays'),
                dataIndex: 'thresholdDays',
                key: 'thresholdDays',
                width: 130,
            },
            {
                title: t('inactiveAudit.table.recipientEmail'),
                dataIndex: 'recipientEmail',
                key: 'recipientEmail',
                width: 230,
            },
            {
                title: t('inactiveAudit.table.recipientAdminId'),
                dataIndex: 'recipientAdminId',
                key: 'recipientAdminId',
                width: 230,
            },
            {
                title: t('inactiveAudit.table.emailDispatched'),
                dataIndex: 'emailDispatched',
                key: 'emailDispatched',
                width: 130,
                render: (value: boolean) => (value ? t('yes') : t('no')),
            },
        ],
        [t],
    );

    return (
        <Page>
            <Page.Title titleKey="inactiveAudit.title" subTitle={String(t('inactiveAudit.subTitle'))} />

            <Space style={{ marginBottom: 16 }} wrap>
                <Select
                    allowClear
                    placeholder={t('inactiveAudit.filters.role')}
                    style={{ width: 180 }}
                    value={accountRole}
                    onChange={(value) => {
                        setAccountRole(value);
                        setPage(1);
                    }}
                    options={[
                        { value: 'ASKER', label: 'ASKER' },
                        { value: 'CONSULTANT', label: 'CONSULTANT' },
                        { value: 'ADMIN', label: 'ADMIN' },
                    ]}
                />
                <Input
                    placeholder={t('inactiveAudit.filters.accountId')}
                    value={accountIdInput}
                    onChange={(event) => setAccountIdInput(event.target.value)}
                    onPressEnter={() => {
                        setAccountIdFilter(accountIdInput);
                        setPage(1);
                    }}
                    style={{ width: 260 }}
                />
                <Button
                    type="primary"
                    onClick={() => {
                        setAccountIdFilter(accountIdInput);
                        setPage(1);
                    }}
                >
                    {t('search')}
                </Button>
                <Button
                    onClick={() => {
                        setAccountRole(undefined);
                        setAccountIdInput('');
                        setAccountIdFilter('');
                        setPage(1);
                    }}
                >
                    {t('btn.cancel')}
                </Button>
            </Space>

            <ListingTable<InactiveAccountAuditLogEntry>
                rowKey={(row) => `${row.id}`}
                loading={isLoading}
                columns={columns}
                dataSource={data?.data ?? []}
                scroll={{ x: 1600 }}
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
        </Page>
    );
};
