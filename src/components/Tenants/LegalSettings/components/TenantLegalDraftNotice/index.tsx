import { Alert, Button, Space } from 'antd';
import { useTranslation } from 'react-i18next';
import styles from './styles.module.scss';

export interface TenantLegalDraftNoticeProps {
    savedAt?: string;
    localSavedAt?: string;
    collision: boolean;
    loadServer: () => void;
    keepLocal: () => void;
    unavailable: boolean;
    retry: () => void;
    conflict: boolean;
    conflictRefreshFailed: boolean;
    conflictRefreshing: boolean;
    retryConflict: () => void;
    reloadConflict: () => void;
    keepEditing: () => void;
    onDiscard?: () => void;
    pending?: boolean;
    /**
     * The plain "a draft is saved, nothing published yet" state. Cards that show it as the
     * editor snackbar (DraftStatusSnackbar) switch it off here, so this box only ever asks
     * for a decision: a load failure, a conflict, or two drafts to choose between.
     */
    showInfo?: boolean;
}

export const TenantLegalDraftNotice = ({
    savedAt,
    localSavedAt,
    collision,
    loadServer,
    keepLocal,
    unavailable,
    retry,
    conflict,
    conflictRefreshFailed,
    conflictRefreshing,
    retryConflict,
    reloadConflict,
    keepEditing,
    onDiscard,
    pending = false,
    showInfo = true,
}: TenantLegalDraftNoticeProps) => {
    const { t, i18n } = useTranslation();
    const rawSavedAt = localSavedAt ?? savedAt;
    const parsedSavedAt = rawSavedAt ? new Date(rawSavedAt) : undefined;
    const savedAtLabel =
        parsedSavedAt && !Number.isNaN(parsedSavedAt.getTime())
            ? parsedSavedAt.toLocaleString(i18n.language, { dateStyle: 'medium', timeStyle: 'short' })
            : rawSavedAt;
    if (unavailable) {
        return (
            <Alert
                className={styles.notice}
                type="error"
                showIcon
                data-testid="tenant-draft-unavailable"
                message={t('legal.serverDraft.unavailable.title')}
                description={t('legal.serverDraft.unavailable.description')}
                action={
                    <Button disabled={pending} onClick={retry}>
                        {t('legal.serverDraft.retry')}
                    </Button>
                }
            />
        );
    }
    if (conflict) {
        const conflictAction = () => {
            if (conflictRefreshing) return undefined;
            if (conflictRefreshFailed) {
                return (
                    <Button disabled={pending} onClick={retryConflict}>
                        {t('legal.serverDraft.retry')}
                    </Button>
                );
            }
            return (
                <Space wrap>
                    <Button disabled={pending} onClick={reloadConflict}>
                        {t('legal.serverDraft.conflict.reload')}
                    </Button>
                    <Button type="primary" disabled={pending} onClick={keepEditing}>
                        {t('legal.serverDraft.conflict.keepEditing')}
                    </Button>
                </Space>
            );
        };
        return (
            <Alert
                className={styles.notice}
                type="warning"
                showIcon
                data-testid="tenant-draft-conflict"
                message={t('legal.serverDraft.conflict.title')}
                description={t('legal.serverDraft.conflict.description')}
                action={conflictAction()}
            />
        );
    }
    if (collision) {
        return (
            <Alert
                className={styles.notice}
                type="warning"
                showIcon
                data-testid="tenant-draft-source-choice"
                message={t('legal.serverDraft.collision.title')}
                description={t('legal.serverDraft.collision.description')}
                action={
                    <Space wrap>
                        <Button disabled={pending} onClick={loadServer}>
                            {t('legal.serverDraft.collision.server')}
                        </Button>
                        <Button disabled={pending} onClick={keepLocal}>
                            {t('legal.serverDraft.collision.local')}
                        </Button>
                    </Space>
                }
            />
        );
    }
    if (!showInfo || (!savedAt && !localSavedAt)) return null;
    return (
        <Alert
            className={`${styles.notice} ${styles.info}`}
            type="info"
            showIcon
            role="status"
            data-testid="tenant-server-draft-notice"
            message={t(localSavedAt ? 'legal.serverDraft.local.title' : 'legal.serverDraft.saved.title')}
            description={t(
                localSavedAt ? 'legal.serverDraft.local.description' : 'legal.serverDraft.saved.description',
                { savedAt: savedAtLabel },
            )}
            action={
                onDiscard ? (
                    <Button disabled={pending} onClick={onDiscard}>
                        {t('legal.serverDraft.discard')}
                    </Button>
                ) : undefined
            }
        />
    );
};
