import { useTranslation } from 'react-i18next';
import { Notify } from '../../../../Notify';

export interface TenantLegalDraftNoticeProps {
    /** Element id of the editor card this notice is about; the pop-up offers "Ansehen" to go there. */
    jumpTarget?: string;
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
    /**
     * The person closed the decision pop-up. It stays closed (the tile shows a quiet line with a
     * button, see `TenantLegalDraftStatus`) until the state changes or the button re-raises it.
     */
    dismissed?: boolean;
    onDismiss?: () => void;
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
    jumpTarget,
    dismissed = false,
    onDismiss,
}: TenantLegalDraftNoticeProps) => {
    const { t, i18n } = useTranslation();
    const rawSavedAt = localSavedAt ?? savedAt;
    const parsedSavedAt = rawSavedAt ? new Date(rawSavedAt) : undefined;
    const savedAtLabel =
        parsedSavedAt && !Number.isNaN(parsedSavedAt.getTime())
            ? parsedSavedAt.toLocaleString(i18n.language, { dateStyle: 'medium', timeStyle: 'short' })
            : rawSavedAt;
    if (dismissed && (unavailable || conflict || collision)) return null;
    if (unavailable) {
        return (
            <Notify
                jump={jumpTarget}
                testId="tenant-draft-unavailable"
                onClose={onDismiss}
                severity="error"
                title={t('legal.serverDraft.unavailable.title')}
                actions={[{ label: t('legal.serverDraft.retry'), onClick: retry, disabled: pending }]}
            >
                {t('legal.serverDraft.unavailable.description')}
            </Notify>
        );
    }
    if (conflict) {
        const conflictActions = () => {
            if (conflictRefreshing) return undefined;
            if (conflictRefreshFailed) {
                return [{ label: t('legal.serverDraft.retry'), onClick: retryConflict, disabled: pending }] as const;
            }
            return [
                { label: t('legal.serverDraft.conflict.reload'), onClick: reloadConflict, disabled: pending },
                { label: t('legal.serverDraft.conflict.keepEditing'), onClick: keepEditing, disabled: pending },
            ] as const;
        };
        return (
            <Notify
                jump={jumpTarget}
                testId="tenant-draft-conflict"
                onClose={onDismiss}
                severity="warning"
                title={t('legal.serverDraft.conflict.title')}
                actions={conflictActions()}
            >
                {t('legal.serverDraft.conflict.description')}
            </Notify>
        );
    }
    if (collision) {
        return (
            <Notify
                jump={jumpTarget}
                testId="tenant-draft-source-choice"
                onClose={onDismiss}
                severity="warning"
                title={t('legal.serverDraft.collision.title')}
                actions={[
                    { label: t('legal.serverDraft.collision.server'), onClick: loadServer, disabled: pending },
                    { label: t('legal.serverDraft.collision.local'), onClick: keepLocal, disabled: pending },
                ]}
            >
                {t('legal.serverDraft.collision.description')}
            </Notify>
        );
    }
    if (!showInfo || (!savedAt && !localSavedAt)) return null;
    return (
        <Notify
            jump={jumpTarget}
            testId="tenant-server-draft-notice"
            severity="info"
            title={t(localSavedAt ? 'legal.serverDraft.local.title' : 'legal.serverDraft.saved.title')}
            actions={
                onDiscard
                    ? [{ label: t('legal.serverDraft.discard'), onClick: onDiscard, disabled: pending }]
                    : undefined
            }
        >
            {t(localSavedAt ? 'legal.serverDraft.local.description' : 'legal.serverDraft.saved.description', {
                savedAt: savedAtLabel,
            })}
        </Notify>
    );
};
