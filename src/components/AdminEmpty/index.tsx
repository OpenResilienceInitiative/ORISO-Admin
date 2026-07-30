import { useTranslation } from 'react-i18next';
import { ReactComponent as EmptyStateIcon } from '../../resources/img/svg/oriso/empty_state_96px.svg';
import styles from './styles.module.scss';

/**
 * The ONE empty state of the admin (owner call 2026-07-30): the ORISO
 * icon-master graphic instead of antd's stock tray drawing.
 *
 * Wired into antd's `ConfigProvider renderEmpty` in src/index.tsx, so every
 * table, list and select that hits "no data" renders this — a component the
 * pages have to opt into would have gone stale in half of them.
 */
export const AdminEmpty = ({ description }: { description?: React.ReactNode }) => {
    const { t } = useTranslation();

    return (
        <div className={styles.empty} data-testid="admin-empty">
            <EmptyStateIcon aria-hidden className={styles.graphic} />
            <p className={styles.text}>{description ?? t('empty.noData', 'Keine Daten')}</p>
        </div>
    );
};

export default AdminEmpty;
