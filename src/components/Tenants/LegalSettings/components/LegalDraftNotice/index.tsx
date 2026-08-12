import { Alert, Button } from 'antd';
import { useTranslation } from 'react-i18next';

interface LegalDraftNoticeProps {
    /** ISO timestamp of the last save; without it there is nothing to announce. */
    savedAt?: string;
    /** A newer version has been published since the draft was saved. */
    stale?: boolean;
    onDiscard: () => void;
}

/**
 * Tells the admin that the editor is showing a locally stored draft rather than the
 * published text. The "this device only" wording is not decoration: the draft lives in
 * localStorage until server-side drafts exist, so a colleague — or the same admin on
 * another machine — sees the published text, not this.
 */
export const LegalDraftNotice = ({ savedAt, stale, onDiscard }: LegalDraftNoticeProps) => {
    const { t, i18n } = useTranslation();
    if (!savedAt) {
        return null;
    }
    const parsed = new Date(savedAt);
    const savedAtLabel = Number.isNaN(parsed.getTime())
        ? savedAt
        : parsed.toLocaleString(i18n.language, { dateStyle: 'medium', timeStyle: 'short' });

    return (
        <Alert
            type={stale ? 'warning' : 'info'}
            showIcon
            message={t('legal.draft.notice.title')}
            description={
                <>
                    <div>{t('legal.draft.notice.description', { savedAt: savedAtLabel })}</div>
                    {stale && <div>{t('legal.draft.notice.stale')}</div>}
                </>
            }
            action={
                <Button size="small" onClick={onDiscard}>
                    {t('legal.draft.discard')}
                </Button>
            }
        />
    );
};

export default LegalDraftNotice;
