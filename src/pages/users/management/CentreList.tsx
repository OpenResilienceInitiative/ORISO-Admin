import { useTranslation } from 'react-i18next';
import { ScopeChip } from '../../../components/UserTable/ScopeChip';
import type { CounselorData } from '../../../types/counselor';
import { displayName, topicsAtCentre } from './userRows';
import styles from './userDataTable.module.scss';

/** Every centre of a person with the topics they counsel on there. */
export const CentreList = ({ row }: { row: CounselorData }) => {
    const { t } = useTranslation();
    return (
        <ul
            className={styles.centres}
            aria-label={t('userTable.centres.of', 'Beratungsstellen von {{name}}', { name: displayName(row) })}
        >
            {row.agencies.map((centre) => {
                const topics = topicsAtCentre(row, centre);
                return (
                    <li key={centre.id} className={styles.centre}>
                        <ScopeChip
                            kind="agency"
                            id={centre.id ?? ''}
                            name={centre.name ?? ''}
                            postcode={centre.postcode}
                            city={centre.city}
                        />
                        <span className={styles.centreName}>{centre.name}</span>
                        {topics && (
                            <span className={styles.topics}>
                                {t('userTable.centres.topicsHere', 'Berät hier')}:{' '}
                                {topics.length ? topics.join(', ') : '—'}
                            </span>
                        )}
                    </li>
                );
            })}
        </ul>
    );
};
