import { Button } from 'antd';
import { useTranslation } from 'react-i18next';
import styles from './styles.module.scss';

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
 *
 * Rendered ABOVE the M3 editor shell, never inside it: the legal cards have a fixed
 * editor height, so a banner in `aboveEditorSlot` clips the text surface.
 */
export const LegalDraftNotice = ({ savedAt, stale, onDiscard }: LegalDraftNoticeProps) => {
    const { t, i18n } = useTranslation();
    if (!savedAt) {
        return null;
    }
    const parsed = new Date(savedAt);
    const savedAtLabel = Number.isNaN(parsed.getTime())
        ? savedAt
        : parsed.toLocaleString(i18n?.language, { dateStyle: 'medium', timeStyle: 'short' });

    return (
        <div className={`${styles.notice} ${stale ? styles.isStale : ''}`} role="status">
            <div className={styles.text}>
                <p className={styles.title}>{t('legal.draft.notice.title')}</p>
                <p className={styles.description}>{t('legal.draft.notice.description', { savedAt: savedAtLabel })}</p>
                {stale && <p className={styles.stale}>{t('legal.draft.notice.stale')}</p>}
            </div>
            <Button className={styles.action} size="small" onClick={onDiscard}>
                {t('legal.draft.discard')}
            </Button>
        </div>
    );
};

export default LegalDraftNotice;
