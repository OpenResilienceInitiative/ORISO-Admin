import { useTranslation } from 'react-i18next';
import { M3Button } from '../M3Button';
import styles from '../UserTable/scopeContextBar.module.scss';

export interface ListSearchBarProps {
    query: string;
    onClear: () => void;
}

/**
 * Says that a list is narrowed by a search from the admin search (⌘K), with one button to show the
 * whole list again. Same look as the Träger/Beratungsstelle context bars, so every reason a list is
 * shorter reads the same way.
 */
export const ListSearchBar = ({ query, onClear }: ListSearchBarProps) => {
    const { t } = useTranslation();
    const caption = t('listSearch.caption', 'Gefiltert nach Suche');

    if (!query) return null;

    return (
        <section className={styles.bar} aria-label={caption} data-testid="list-search-bar">
            <div className={styles.text}>
                <span className={styles.caption}>{caption}</span>
                <span className={styles.name}>
                    {t('listSearch.quoteOpen', '„')}
                    {query}
                    {t('listSearch.quoteClose', '“')}
                </span>
            </div>
            <M3Button variant="text" onClick={onClear}>
                {t('listSearch.clear', 'Ganze Liste zeigen')}
            </M3Button>
        </section>
    );
};

export default ListSearchBar;
