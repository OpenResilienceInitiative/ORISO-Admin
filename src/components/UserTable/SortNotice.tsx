import { useTranslation } from 'react-i18next';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import styles from './sortNotice.module.scss';

export interface SortNoticeProps {
    /** The order actually on screen, e.g. "Zuletzt aktualisiert, neueste zuerst". */
    shownOrder: string;
}

/** The server rejected the chosen sort; says which order is shown instead. */
export const SortNotice = ({ shownOrder }: SortNoticeProps) => {
    const { t } = useTranslation();
    return (
        <p className={styles.notice} role="status">
            <InfoOutlinedIcon className={styles.icon} aria-hidden />
            <span>
                {t('userTable.sortNotice', 'Diese Sortierung ist hier nicht möglich. Angezeigt wird: {{order}}.', {
                    order: shownOrder,
                })}
            </span>
        </p>
    );
};
