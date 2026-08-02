import { Table, Tag } from 'antd';
import { ColumnProps } from 'antd/lib/table';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Page } from '../../../components/Page';
import { SupportAccessAuditEntry, useSupportAccessAudit } from '../../../hooks/useSupportAccessAudit';

const PAGE_SIZE = 20;

const eventTagColor = (event: string) => {
    if (event === 'CONFIRMED' || event === 'SUPPORT_SESSION_STARTED') return 'success';
    if (event === 'SESSION_NOT_ESTABLISHED' || event === 'DECLINED') return 'default';
    if (event === 'CONFIRM_REJECTED' || event === 'SUPPORT_PROVISIONING_FAILED') return 'error';
    return 'processing';
};

/**
 * Audit of every support-access decision (ADR-018 §6).
 *
 * <p>The page sends no scope of its own — a Platform Admin sees everything, a Träger admin their
 * tenant, a Beratungsstellen admin their agencies, and the backend decides which. What is shown is
 * limited to IDs, timestamps and outcomes: no message content and no credentials ever reach it.
 */
export const SupportAccessAudit = () => {
    const { t } = useTranslation();
    const [current, setCurrent] = useState(1);
    const { data, isLoading } = useSupportAccessAudit({ current, pageSize: PAGE_SIZE });

    const columns = useMemo<Array<ColumnProps<SupportAccessAuditEntry>>>(
        () => [
            {
                key: 'createDate',
                dataIndex: 'createDate',
                title: t('supportAccess.audit.date'),
                width: 190,
                render: (value: string) => new Date(value).toLocaleString(),
            },
            {
                key: 'event',
                dataIndex: 'event',
                title: t('supportAccess.audit.event'),
                width: 220,
                render: (event: string) => <Tag color={eventTagColor(event)}>{event}</Tag>,
            },
            { key: 'purpose', dataIndex: 'purpose', title: t('supportAccess.audit.purpose'), width: 170 },
            { key: 'actorId', dataIndex: 'actorId', title: t('supportAccess.audit.actor'), ellipsis: true },
            {
                key: 'counterpartId',
                dataIndex: 'counterpartId',
                title: t('supportAccess.audit.counterpart'),
                ellipsis: true,
            },
            { key: 'agencyId', dataIndex: 'agencyId', title: t('supportAccess.audit.agency'), width: 120 },
        ],
        [t],
    );

    return (
        <Page>
            <Page.Title titleKey="supportAccess.audit.title" />
            <Table
                loading={isLoading}
                rowKey="id"
                columns={columns}
                dataSource={data?.data ?? []}
                locale={{ emptyText: t('supportAccess.audit.empty') }}
                pagination={{
                    current,
                    pageSize: PAGE_SIZE,
                    total: data?.total ?? 0,
                    onChange: setCurrent,
                    showSizeChanger: false,
                }}
            />
        </Page>
    );
};
