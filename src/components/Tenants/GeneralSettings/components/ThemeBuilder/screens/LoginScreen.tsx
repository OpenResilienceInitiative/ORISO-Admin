import { useTranslation } from 'react-i18next';
import styles from './screens.module.scss';

/** The sign-in screen — shows the seed effect on forms and actions. */
export const LoginScreen = () => {
    const { t } = useTranslation();
    return (
        <div className={styles.login}>
            <div className={styles.loginCard}>
                <span className={styles.loginBrand} aria-hidden />
                <span className={styles.loginHeadline}>{t('theme.builder.preview.login.headline')}</span>
                <span className={styles.loginField}>
                    {t('theme.builder.preview.login.username')}
                    <span className={styles.loginInput} />
                </span>
                <span className={styles.loginField}>
                    {t('theme.builder.preview.login.password')}
                    <span className={styles.loginInput} />
                </span>
                <span className={styles.loginSubmit}>{t('theme.builder.preview.login.submit')}</span>
                <span className={styles.loginLink}>{t('theme.builder.preview.login.forgot')}</span>
            </div>
        </div>
    );
};
