import { useTranslation } from 'react-i18next';
import { M3Button } from '../M3Button';
import styles from './loadMoreFooter.module.scss';

export interface LoadMoreFooterProps {
    shown: number;
    total: number;
    onLoadMore: () => void;
    loading?: boolean;
}

/** Phone list footer: "6 von 48" and „Weitere laden"; disabled once everything is shown. */
export const LoadMoreFooter = ({ shown, total, onLoadMore, loading = false }: LoadMoreFooterProps) => {
    const { t } = useTranslation();
    return (
        <div className={styles.footer}>
            <span className={styles.count} aria-live="polite">
                {t('userTable.loadMore.count', '{{shown}} von {{total}}', { shown, total })}
            </span>
            <M3Button variant="outlined" loading={loading} disabled={shown >= total} onClick={onLoadMore}>
                {t('userTable.loadMore.button', 'Weitere laden')}
            </M3Button>
        </div>
    );
};
