import { Button, Form, message } from 'antd';
import type { TablePaginationConfig } from 'antd/es/table';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    buildTopicInviteLinkUrl,
    CHAT_TYPE_OPTIONS,
    createTopicInviteLink,
    deactivateTopicInviteLink,
    formatAnonymityLabel,
    formatChatTypeLabel,
    listTopicInviteLinks,
    TopicInviteLinkDTO,
} from '../../api/invitelinks/topicInviteLinks';
import { FloatingLabelSelect } from '../FloatingLabelSelect';
import { Modal } from '../Modal';
import { ListingTable, listingTableStyles } from '../ListingTable';
import { useTenantTopics } from '../../hooks/useTenantTopics';
import type { LiveChatLinksAccess } from '../../constants/liveChatLinksAccess';
import { AnonymityTag, StatusTag } from '../../pages/Links/components/StatusTag';
import styles from './liveChatLinks.module.scss';

const LINK_KIND = 'EXTERNAL_INBOUND' as const;
const DEFAULT_ANONYMITY = 'FULL' as const;

export interface LiveChatLinksProps {
    /** `manage`: platform admin. `read`: Träger and Beratungsstellen admins copy only. */
    mode: Exclude<LiveChatLinksAccess, 'none'>;
}

/**
 * The links advice seekers open a live chat with, shown in Funktionszugriff
 * next to the chat settings (ORISO-Admin#1321). Only the platform admin creates
 * and switches them off; everyone else sees the active links of their scope —
 * the server limits the list — and copies them.
 */
export const LiveChatLinks = ({ mode }: LiveChatLinksProps) => {
    const canManage = mode === 'manage';
    const { t } = useTranslation();
    const [form] = Form.useForm();
    const { data: topics = [], isLoading: isLoadingTopics } = useTenantTopics(true);
    const [links, setLinks] = useState<TopicInviteLinkDTO[]>([]);
    const [loadingLinks, setLoadingLinks] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [linkToDeactivate, setLinkToDeactivate] = useState<TopicInviteLinkDTO | null>(null);
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
                    // Without the kind filter the server also returns account invites.
                    linkKind: LINK_KIND,
                    // A copied link that no longer works is worse than none.
                    status: canManage ? undefined : 'ACTIVE',
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
        [canManage, t],
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

    const onDeactivate = useCallback(async () => {
        if (!linkToDeactivate) {
            return;
        }
        const { id } = linkToDeactivate;
        setLinkToDeactivate(null);
        try {
            await deactivateTopicInviteLink(id);
            message.success(t('links.deactivated', 'Link deactivated'));
        } catch {
            message.error(t('links.error.deactivateFailed', 'Could not deactivate link'));
        }
        // Reload either way: a failed call is most often a link that changed state meanwhile.
        await loadLinks(pagination.current, pagination.pageSize);
    }, [linkToDeactivate, loadLinks, pagination, t]);

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
                    <>
                        <Button size="small" className={listingTableStyles.copyButton} onClick={() => copyLink(record)}>
                            {t('links.copy', 'Copy')}
                        </Button>
                        {/* The list holds every link kind; only an external live-chat inbound
                            is switched off here. */}
                        {canManage &&
                            record.status === 'ACTIVE' &&
                            record.linkKind === LINK_KIND &&
                            record.chatType === 'LIVE_CHAT' && (
                                <Button
                                    size="small"
                                    className={listingTableStyles.copyButton}
                                    onClick={() => setLinkToDeactivate(record)}
                                >
                                    {t('links.deactivate', 'Deactivate')}
                                </Button>
                            )}
                    </>
                ),
            },
        ],
        [canManage, copyLink, resolveTopicName, t],
    );

    const showEmptyHint = !canManage && !loadingLinks && pagination.total === 0;

    return (
        <section className={styles.section} aria-labelledby="live-chat-links-title">
            <header className={styles.header}>
                <h3 className={styles.title} id="live-chat-links-title">
                    {t('liveChatLinks.title')}
                </h3>
                <p className={styles.hint}>
                    {canManage ? t('liveChatLinks.manage.hint') : t('liveChatLinks.readOnly.hint')}
                </p>
            </header>
            {canManage && (
                <Form
                    form={form}
                    className={listingTableStyles.createForm}
                    layout="inline"
                    initialValues={{ chatType: CHAT_TYPE_OPTIONS[0].value }}
                    onFinish={onCreate}
                >
                    {/* The M3 outlined select with its floating label — the same
                        control the invite composer uses. */}
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
            )}

            {showEmptyHint ? (
                <p className={styles.empty}>{t('liveChatLinks.readOnly.empty')}</p>
            ) : (
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
            )}

            {linkToDeactivate !== null && (
                <Modal
                    titleKey="links.deactivateConfirm.title"
                    contentKey="links.deactivateConfirm.body"
                    contentKeyOptions={{ topic: resolveTopicName(linkToDeactivate) }}
                    okLabelKey="links.deactivate"
                    cancelLabelKey="links.deactivateConfirm.cancel"
                    onConfirm={onDeactivate}
                    onClose={() => setLinkToDeactivate(null)}
                />
            )}
        </section>
    );
};
