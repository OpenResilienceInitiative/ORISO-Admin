import { useTranslation } from 'react-i18next';
import EditorHintSnackbar from '../../../../FormPluginEditor/EditorHintSnackbar';
import type { TenantLegalDraftNoticeProps } from '../TenantLegalDraftNotice';

/** Whether the notice would only inform (no decision pending) — the case that becomes a snackbar. */
export const isDraftInfoState = ({
    savedAt,
    localSavedAt,
    collision,
    unavailable,
    conflict,
}: Pick<TenantLegalDraftNoticeProps, 'savedAt' | 'localSavedAt' | 'collision' | 'unavailable' | 'conflict'>) =>
    !unavailable && !conflict && !collision && !!(savedAt || localSavedAt);

/**
 * "Draft from … – not published yet. The previous version stays live until then." as the
 * editor snackbar, with Discard as its one action. Replaces the info box that said "You are
 * editing a server draft" — a sentence about storage, not about what the admin can expect.
 */
export const DraftStatusSnackbar = ({
    savedAt,
    localSavedAt,
    onDiscard,
    onClose,
    pending = false,
}: {
    savedAt?: string;
    localSavedAt?: string;
    onDiscard?: () => void;
    onClose: () => void;
    pending?: boolean;
}) => {
    const { t, i18n } = useTranslation();
    const raw = localSavedAt ?? savedAt;
    const parsed = raw ? new Date(raw) : undefined;
    const label =
        parsed && !Number.isNaN(parsed.getTime())
            ? parsed.toLocaleString(i18n.language, { dateStyle: 'medium', timeStyle: 'short' })
            : raw;
    return (
        <div data-testid="legal-draft-snackbar">
            <EditorHintSnackbar
                text={t(localSavedAt ? 'legal.draftSnackbar.local' : 'legal.draftSnackbar.saved', { savedAt: label })}
                onClose={onClose}
                onDismiss={onDiscard}
                actionLabel={t('legal.draftSnackbar.discard')}
                actionDisabled={pending}
                closeLabel={t('legal.draftSnackbar.close')}
            />
        </div>
    );
};
