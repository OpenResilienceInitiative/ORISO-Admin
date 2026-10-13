import classNames from 'classnames';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './styles.module.scss';

export type RegistrationAudience = 'counsellor' | 'agencyAdmin';

/** A public, read-only introduction. It needs neither an account session nor an enabled tour. */
export const RegistrationGuide = ({ audience }: { audience: RegistrationAudience }) => {
    const { t } = useTranslation();
    const headingId = useId();
    const key = `registrationGuide.${audience}`;

    return (
        <section className={styles.guide} aria-labelledby={headingId}>
            <h2 id={headingId} className="m3-title-medium">
                {t('registrationGuide.title')}
            </h2>
            <ul className={classNames('m3-body-medium', styles.features)}>
                {[1, 2, 3].map((item) => (
                    <li key={item}>{t(`${key}.features.${item}`)}</li>
                ))}
            </ul>
            <details className={styles.quickStart}>
                <summary className="m3-label-large">{t('registrationGuide.quickStart')}</summary>
                <ol className="m3-body-medium">
                    {[1, 2, 3].map((item) => (
                        <li key={item}>{t(`${key}.steps.${item}`)}</li>
                    ))}
                </ol>
            </details>
            <p className={classNames('m3-body-medium', styles.tutorials)}>{t(`${key}.tutorials`)}</p>
        </section>
    );
};
