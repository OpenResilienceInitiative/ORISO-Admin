import { Alert, Button, Space } from 'antd';
import { useTranslation } from 'react-i18next';
import styles from './styles.module.scss';

interface Props {
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
}: Props) => {
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
                action={<Button onClick={retry}>{t('legal.serverDraft.retry')}</Button>}
            />
        );
    }
    if (conflict) {
        const conflictAction = () => {
            if (conflictRefreshing) return undefined;
            if (conflictRefreshFailed) {
                return <Button onClick={retryConflict}>{t('legal.serverDraft.retry')}</Button>;
            }
            return (
                <Space wrap>
                    <Button onClick={reloadConflict}>{t('legal.serverDraft.conflict.reload')}</Button>
                    <Button type="primary" onClick={keepEditing}>
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
                        <Button onClick={loadServer}>{t('legal.serverDraft.collision.server')}</Button>
                        <Button onClick={keepLocal}>{t('legal.serverDraft.collision.local')}</Button>
                    </Space>
                }
            />
        );
    }
    if (!savedAt && !localSavedAt) return null;
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
            action={onDiscard ? <Button onClick={onDiscard}>{t('legal.serverDraft.discard')}</Button> : undefined}
        />
    );
};
