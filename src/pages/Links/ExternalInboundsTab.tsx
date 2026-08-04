import { Button, Form, message } from 'antd';
import type { TablePaginationConfig } from 'antd/es/table';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    buildTopicInviteLinkUrl,
    CHAT_TYPE_OPTIONS,
    createTopicInviteLink,
    formatAnonymityLabel,
    formatChatTypeLabel,
    listTopicInviteLinks,
    TopicInviteLinkDTO,
} from '../../api/invitelinks/topicInviteLinks';
import { FloatingLabelSelect } from '../../components/FloatingLabelSelect';
import { ListingTable, listingTableStyles } from '../../components/ListingTable';
import { useTenantTopics } from '../../hooks/useTenantTopics';
import { AnonymityTag, StatusTag } from './components/StatusTag';
import styles from './styles.module.scss';

const LINK_KIND = 'EXTERNAL_INBOUND' as const;
const DEFAULT_ANONYMITY = 'FULL' as const;

export const ExternalInboundsTab = () => {
    const { t } = useTranslation();
    const [form] = Form.useForm();
    const { data: topics = [], isLoading: isLoadingTopics } = useTenantTopics(true);
    const [links, setLinks] = useState<TopicInviteLinkDTO[]>([]);
    const [loadingLinks, setLoadingLinks] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });

    const topicOptions = useMemo(() => topics.map((topic) => ({ value: topic.id, label: topic.name })), [topics]);

    const topicNameById = useMemo(() => {
        const map = new Map<number, string>();
        topics.forEach((topic) => {
            if (topic.id != null) {
                map.set(topic.id, topic.name);
            }
        });
        return map;
    }, [topics]);

    const resolveTopicName = useCallback(
        (link: TopicInviteLinkDTO) => link.topicName || topicNameById.get(link.topicId) || String(link.topicId),
        [topicNameById],
    );

    const loadLinks = useCallback(
        async (page: number, pageSize: number) => {
            setLoadingLinks(true);
            try {
                const response = await listTopicInviteLinks({
                    page: page - 1,
                    size: pageSize,
                });
                setLinks(response.content ?? []);
                setPagination({
                    current: (response.page ?? 0) + 1,
                    pageSize: response.size ?? pageSize,
                    total: response.totalElements ?? 0,
                });
            } catch {
                message.error(t('links.error.loadFailed', 'Could not load links'));
            } finally {
                setLoadingLinks(false);
            }
        },
        [t],
    );

    useEffect(() => {
        loadLinks(1, 20);
    }, [loadLinks]);

    const copyLink = useCallback(
        (link: TopicInviteLinkDTO) => {
            const topicName = resolveTopicName(link);
            const url = buildTopicInviteLinkUrl(link.token, topicName);
            navigator.clipboard
                .writeText(url)
                .then(() => message.success(t('links.copied', 'Link copied')))
                .catch(() => message.error(t('links.copyFailed', 'Copy failed')));
        },
        [resolveTopicName, t],
    );

    const onCreate = useCallback(
        async (values: { topicId: number; chatType: string }) => {
            setSubmitting(true);
            try {
                await createTopicInviteLink({
                    topicId: Number(values.topicId),
                    linkKind: LINK_KIND,
                    chatType: values.chatType as 'LIVE_CHAT',
                    anonymity: DEFAULT_ANONYMITY,
                });
                message.success(t('links.created', 'Link created'));
                form.resetFields(['topicId']);
                await loadLinks(1, pagination.pageSize);
            } catch {
                message.error(t('links.error.createFailed', 'Could not create link'));
            } finally {
                setSubmitting(false);
            }
        },
        [form, loadLinks, pagination.pageSize, t],
    );

    const onTableChange = useCallback(
        (tablePagination: TablePaginationConfig) => {
            const nextPage = tablePagination.current ?? 1;
            const nextSize = tablePagination.pageSize ?? 20;
            loadLinks(nextPage, nextSize);
        },
        [loadLinks],
    );

    const formatDate = (value: string | null) => {
        if (!value) {
            return t('links.never', 'Never');
        }
        return new Date(value).toLocaleString();
    };

    const columns = useMemo(
        () => [
            {
                title: t('links.col.chatType', 'Chat Type'),
                dataIndex: 'chatType',
                key: 'chatType',
                render: (value: string) => formatChatTypeLabel(value),
            },
            {
                title: t('links.col.topic', 'Topic'),
                key: 'topic',
                render: (_: unknown, record: TopicInviteLinkDTO) => resolveTopicName(record),
            },
            {
                title: t('links.col.createdAt', 'Created at'),
                dataIndex: 'createDate',
                key: 'createDate',
                render: (value: string) => formatDate(value),
            },
            {
                title: t('links.col.createdBy', 'Created by'),
                dataIndex: 'createdByUsername',
                key: 'createdByUsername',
                render: (value: string | null) => value || '—',
            },
            {
                title: t('links.col.status', 'Status'),
                dataIndex: 'status',
                key: 'status',
                render: (status: TopicInviteLinkDTO['status']) => <StatusTag status={status} />,
            },
            {
                title: t('links.col.expiresAt', 'Expires'),
                dataIndex: 'expiresAt',
                key: 'expiresAt',
                render: (value: string | null) => formatDate(value),
            },
            {
                title: t('links.col.anonymity', 'Anonymity'),
                dataIndex: 'anonymity',
                key: 'anonymity',
                render: (value: string) => <AnonymityTag value={formatAnonymityLabel(value)} />,
            },
            {
                title: t('links.col.link', 'Link'),
                key: 'link',
                render: (_: unknown, record: TopicInviteLinkDTO) => (
                    <Button size="small" className={listingTableStyles.copyButton} onClick={() => copyLink(record)}>
                        {t('links.copy', 'Copy')}
                    </Button>
                ),
            },
        ],
        [copyLink, resolveTopicName, t],
    );

    return (
        <>
            <Form
                form={form}
                className={listingTableStyles.createForm}
                layout="inline"
                initialValues={{ chatType: CHAT_TYPE_OPTIONS[0].value }}
                onFinish={onCreate}
            >
                {/* The M3 outlined select with its floating label — the same
                    control the invite composer one tab over uses. This form
                    still ran antd's stock select with a left-hand label, its
                    colon and weight-900 caps, which is where the "outdated ant
                    components" reading came from. */}
                <div className={listingTableStyles.formFields}>
                    <Form.Item name="topicId" rules={[{ required: true, message: t('plsSelect') }]} noStyle>
                        <FloatingLabelSelect
                            allowClear
                            className={styles.inboundField}
                            label={t('links.form.topic', 'Topic')}
                            loading={isLoadingTopics}
                            options={topicOptions}
                        />
                    </Form.Item>
                    <Form.Item name="chatType" rules={[{ required: true }]} noStyle>
                        <FloatingLabelSelect
                            className={styles.inboundField}
                            label={t('links.form.chatType', 'Chat Type')}
                            options={CHAT_TYPE_OPTIONS}
                        />
                    </Form.Item>
                </div>
                <Form.Item>
                    <Button
                        type="primary"
                        htmlType="submit"
                        loading={submitting}
                        className={listingTableStyles.createButton}
                    >
                        {t('links.createLink', 'Create link')}
                    </Button>
                </Form.Item>
            </Form>

            <ListingTable
                rowKey="id"
                loading={loadingLinks}
                columns={columns}
                dataSource={links}
                pagination={{
                    current: pagination.current,
                    pageSize: pagination.pageSize,
                    total: pagination.total,
                    showSizeChanger: true,
                    pageSizeOptions: ['10', '20', '30'],
                }}
                onChange={onTableChange}
            />
        </>
    );
};
