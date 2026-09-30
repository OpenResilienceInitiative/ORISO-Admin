import { Button } from 'antd';
import { useTranslation } from 'react-i18next';
import PublicPageLayoutWrapper from '../../components/Layout/PublicPageLayoutWrapper';
import { UserRole } from '../../enums/UserRole';
import { useUserRoles } from '../../hooks/useUserRoles.hook';
import logout from '../../api/auth/logout';
import { ReactComponent as UnauthorizedIcon } from '../../resources/img/illustrations/unauthorized.svg';
import styles from './styles.module.scss';

export const AccessDenied = () => {
    const { t } = useTranslation();
    const { hasRole } = useUserRoles();
    const redirectPath = hasRole([UserRole.SingleTenantAdmin, UserRole.TenantAdmin]) ? '/admin' : '/app';

    return (
        <PublicPageLayoutWrapper hideFooter>
            <div className={styles.wrapper}>
                <div className={styles.illustrationContainer}>
                    <UnauthorizedIcon className={styles.illustration} />
                </div>
                <div className={styles.infoContainer}>
                    <h1 className={styles.title}>{t('errorPages.accessDenied.title')}</h1>
                    <div className={styles.description}>{t('errorPages.accessDenied.description')}</div>

                    <div className={styles.actions}>
                        <Button href={redirectPath} type="primary">
                            {t('toHomePage')}
                        </Button>
                        {/* The page sits outside the protected layout, so without this the
                            only way out of a 403 loop was to let the session expire. */}
                        <Button onClick={() => logout(true)}>{t('logout')}</Button>
                    </div>
                </div>
            </div>
        </PublicPageLayoutWrapper>
    );
};
