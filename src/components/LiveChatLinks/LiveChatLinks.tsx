import AddIcon from '@mui/icons-material/Add';
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import PauseCircleOutlineIcon from '@mui/icons-material/PauseCircleOutlined';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutlined';
import { message } from 'antd';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
    buildTopicInviteLinkUrl,
    createTopicInviteLink,
    deactivateTopicInviteLink,
    deleteTopicInviteLink,
    listTopicInviteLinks,
    reactivateTopicInviteLink,
    TopicInviteLinkDTO,
} from '../../api/invitelinks/topicInviteLinks';
import { FloatingLabelSelect } from '../FloatingLabelSelect';
import { IconButton } from '../IconButton';
import { M3Button } from '../M3Button';
import { M3Tooltip } from '../M3Tooltip';
import { Modal } from '../Modal';
import { useLiveChatLinkTopics } from '../../hooks/useLiveChatLinkTopics';
import type { LiveChatLinksAccess } from '../../constants/liveChatLinksAccess';
import styles from './liveChatLinks.module.scss';

const LINK_KIND = 'EXTERNAL_INBOUND' as const;
const CHAT_TYPE = 'LIVE_CHAT' as const;
const DEFAULT_ANONYMITY = 'FULL' as const;
const PAGE_SIZE = 20;

export interface LiveChatLinksProps {
    /** `manage`: platform admin. `read`: Träger and Beratungsstellen admins copy only. */
    mode: Exclude<LiveChatLinksAccess, 'none'>;
    tenantId?: number;
}

/**
 * The links advice seekers open a live chat with, on the live-chat tile in
 * Funktionszugriff (ORISO-Admin#1321). Only the platform admin creates and
 * switches them on and off or deletes them; everyone else sees the active links
 * of their scope — the server limits the list — and copies them.
 */
export const LiveChatLinks = ({ mode, tenantId }: LiveChatLinksProps) => {
    const canManage = mode === 'manage';
    const { t } = useTranslation();
    const { data: topics = [], isLoading: isLoadingTopics, isError: topicsFailed } = useLiveChatLinkTopics(tenantId);
    const [topicId, setTopicId] = useState<number>();
    // FloatingLabelSelect keeps its own value once cleared, so a new link remounts it.
    const [createdCount, setCreatedCount] = useState(0);
    const [links, setLinks] = useState<TopicInviteLinkDTO[]>([]);
    const [total, setTotal] = useState(0);
    const [size, setSize] = useState(PAGE_SIZE);
    const [loadingLinks, setLoadingLinks] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [linkToDeactivate, setLinkToDeactivate] = useState<TopicInviteLinkDTO | null>(null);
    const [linkToDelete, setLinkToDelete] = useState<TopicInviteLinkDTO | null>(null);

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

    const loadLinks = useCallback(async () => {
        setLoadingLinks(true);
        try {
            const response = await listTopicInviteLinks({
                page: 0,
                size,
                tenantId,
                // Without the kind filter the server also returns account invites.
                linkKind: LINK_KIND,
                // A copied link that no longer works is worse than none.
                status: canManage ? undefined : 'ACTIVE',
            });
            setLinks(response.content ?? []);
            setTotal(response.totalElements ?? 0);
        } catch {
            message.error(t('links.error.loadFailed', 'Could not load links'));
        } finally {
            setLoadingLinks(false);
        }
    }, [canManage, size, t, tenantId]);

    useEffect(() => {
        loadLinks();
    }, [loadLinks]);

    const copyLink = (link: TopicInviteLinkDTO) => {
        const url = buildTopicInviteLinkUrl(link.token, resolveTopicName(link));
        navigator.clipboard
            .writeText(url)
            .then(() => message.success(t('links.copied', 'Link copied')))
            .catch(() => message.error(t('links.copyFailed', 'Copy failed')));
    };

    const onCreate = async () => {
        if (topicId == null || topicsFailed) {
            return;
        }
        setSubmitting(true);
        try {
            await createTopicInviteLink(
                {
                    topicId,
                    linkKind: LINK_KIND,
                    chatType: CHAT_TYPE,
                    anonymity: DEFAULT_ANONYMITY,
                },
                tenantId,
            );
            message.success(t('links.created', 'Link created'));
            setTopicId(undefined);
            setCreatedCount((count) => count + 1);
            await loadLinks();
        } catch {
            message.error(t('links.error.createFailed', 'Could not create link'));
        } finally {
            setSubmitting(false);
        }
    };

    const onDeactivate = async () => {
        if (!linkToDeactivate) {
            return;
        }
        const { id } = linkToDeactivate;
        setLinkToDeactivate(null);
        try {
            await deactivateTopicInviteLink(id, tenantId);
            message.success(t('links.deactivated', 'Link deactivated'));
        } catch {
            message.error(t('links.error.deactivateFailed', 'Could not deactivate link'));
        }
        // Reload either way: a failed call is most often a link that changed state meanwhile.
        await loadLinks();
    };

    const onReactivate = async ({ id }: TopicInviteLinkDTO) => {
        try {
            await reactivateTopicInviteLink(id, tenantId);
            message.success(t('liveChatLinks.reactivated'));
        } catch {
            message.error(t('liveChatLinks.reactivateFailed'));
        }
        await loadLinks();
    };

    const onDelete = async () => {
        if (!linkToDelete) {
            return;
        }
        const { id } = linkToDelete;
        setLinkToDelete(null);
        try {
            await deleteTopicInviteLink(id, tenantId);
            message.success(t('liveChatLinks.deleted'));
        } catch {
            message.error(t('liveChatLinks.deleteFailed'));
        }
        await loadLinks();
    };

    const action = (label: string, icon: ReactNode, onClick: () => void) => (
        <M3Tooltip text={label} portal>
            <span className={styles.action}>
                <IconButton ariaLabel={label} icon={icon} size={36} onClick={onClick} />
            </span>
        </M3Tooltip>
    );

    const isEmpty = !loadingLinks && links.length === 0;

    return (
        <section className={styles.section} aria-label={t('liveChatLinks.title')}>
            {canManage ? (
                <div className={styles.createRow}>
                    <FloatingLabelSelect
                        key={createdCount}
                        allowClear
                        className={styles.topicField}
                        label={t('links.form.topic', 'Topic')}
                        loading={isLoadingTopics}
                        options={topicOptions}
                        value={topicId}
                        onChange={(value) => setTopicId(value == null ? undefined : Number(value))}
                    />
                    <M3Button
                        variant="filled"
                        className={styles.createButton}
                        icon={<AddIcon />}
                        disabled={topicId == null || topicsFailed}
                        loading={submitting}
                        onClick={onCreate}
                    >
                        {t('links.createLink', 'Create link')}
                    </M3Button>
                </div>
            ) : (
                <p className={styles.note}>{t('liveChatLinks.readOnly.hint')}</p>
            )}

            {canManage && topicsFailed && (
                <p className={styles.note} role="alert">
                    {t('liveChatLinks.topicsFailed')}
                </p>
            )}

            {isEmpty && (
                <p className={styles.note}>
                    {canManage ? t('liveChatLinks.manage.empty') : t('liveChatLinks.readOnly.empty')}
                </p>
            )}

            {links.length > 0 && (
                <ul className={styles.list}>
                    {links.map((link) => (
                        <li key={link.id} className={styles.row}>
                            <div className={styles.rowText}>
                                <span className={styles.topic}>{resolveTopicName(link)}</span>
                                <span className={styles.date}>
                                    {new Date(link.createDate).toLocaleDateString()}
                                    {link.status !== 'ACTIVE' && ` · ${t(`liveChatLinks.status.${link.status}`)}`}
                                </span>
                            </div>
                            <div className={styles.actions}>
                                {link.status === 'ACTIVE' &&
                                    action(t('links.copy', 'Copy'), <ContentCopyOutlinedIcon fontSize="small" />, () =>
                                        copyLink(link),
                                    )}
                                {/* The list holds every link kind; only an external live-chat inbound
                                    is managed here. */}
                                {canManage && link.linkKind === LINK_KIND && link.chatType === CHAT_TYPE && (
                                    <>
                                        {link.status === 'ACTIVE' &&
                                            action(
                                                t('links.deactivate', 'Deactivate'),
                                                <PauseCircleOutlineIcon fontSize="small" />,
                                                () => setLinkToDeactivate(link),
                                            )}
                                        {link.status === 'DISABLED' &&
                                            action(
                                                t('liveChatLinks.reactivate'),
                                                <PlayCircleOutlineIcon fontSize="small" />,
                                                () => onReactivate(link),
                                            )}
                                        {action(t('liveChatLinks.delete'), <DeleteOutlineIcon fontSize="small" />, () =>
                                            setLinkToDelete(link),
                                        )}
                                    </>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            {total > links.length && links.length > 0 && (
                <M3Button loading={loadingLinks} onClick={() => setSize((current) => current + PAGE_SIZE)}>
                    {t('liveChatLinks.showMore')}
                </M3Button>
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

            {linkToDelete !== null && (
                <Modal
                    titleKey="liveChatLinks.deleteConfirm.title"
                    contentKey="liveChatLinks.deleteConfirm.body"
                    contentKeyOptions={{ topic: resolveTopicName(linkToDelete) }}
                    okLabelKey="liveChatLinks.delete"
                    cancelLabelKey="links.deactivateConfirm.cancel"
                    onConfirm={onDelete}
                    onClose={() => setLinkToDelete(null)}
                />
            )}
        </section>
    );
};
