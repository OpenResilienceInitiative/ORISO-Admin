import { useTranslation } from 'react-i18next';
import { TenantDeletionError, tenantDeletionBlockerLines } from '../../../api/tenant/tenantDeletionBlockers';
import styles from './TenantDeleteErrorMessage.module.scss';

/**
 * Why a Träger could not be deleted (ORISO-UserService#1466): what is still left in it, that the
 * check could not run, or, for anything else, a neutral "try again".
 */
export const TenantDeleteErrorMessage = ({ error }: { error: unknown }) => {
    const { t } = useTranslation();

    if (error instanceof TenantDeletionError && error.reason === 'blocked') {
        const lines = error.blockers
            ? tenantDeletionBlockerLines(error.blockers, (key, options) => t(key, options))
            : [];
        if (lines.length === 0) return <>{t('tenants.list.deleteMessage.blockers.unknown')}</>;
        return (
            <>
                {t('tenants.list.deleteMessage.blockers.intro')}
                <span role="list" className={styles.list}>
                    {lines.map((line) => (
                        <span role="listitem" key={line} className={styles.item}>
                            {line}
                        </span>
                    ))}
                </span>
            </>
        );
    }
    if (error instanceof TenantDeletionError && error.reason === 'unavailable') {
        return <>{t('tenants.list.deleteMessage.error.unavailable')}</>;
    }
    return <>{t('tenants.list.deleteMessage.error.description')}</>;
};
