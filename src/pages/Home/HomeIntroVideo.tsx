import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import PlayArrowRounded from '@mui/icons-material/PlayArrowRounded';
import { PillGroup } from '../../components/PillGroup';
import styles from './home.module.scss';

export type IntroVideoLanguage = 'de' | 'en';

/**
 * Where the welcome video lives per language. Empty until the compressed
 * files are uploaded; the card then shows a placeholder instead of a broken
 * player (ORISO-Admin#1374).
 */
export const HOME_INTRO_VIDEO_SOURCES: Partial<Record<IntroVideoLanguage, string>> = {};

const LANGUAGES: IntroVideoLanguage[] = ['de', 'en'];

export const HomeIntroVideo = ({
    sources = HOME_INTRO_VIDEO_SOURCES,
}: {
    sources?: Partial<Record<IntroVideoLanguage, string>>;
}) => {
    const { t, i18n } = useTranslation();
    const current = i18n?.resolvedLanguage || i18n?.language || 'de';
    const initial: IntroVideoLanguage = current.startsWith('en') ? 'en' : 'de';
    const [language, setLanguage] = useState<IntroVideoLanguage>(initial);
    const source = sources[language];

    return (
        <section className={styles.videoCard} aria-labelledby="home-video-title">
            <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle} id="home-video-title">
                    {t('home.video.title')}
                </h2>
                <div role="group" aria-label={t('home.video.language')}>
                    <PillGroup
                        mode="single"
                        options={LANGUAGES.map((code) => ({ value: code, label: t(`home.video.language.${code}`) }))}
                        value={[language]}
                        onChange={([next]) => next && setLanguage(next as IntroVideoLanguage)}
                    />
                </div>
            </div>
            {source ? (
                // eslint-disable-next-line jsx-a11y/media-has-caption -- captions ship inside the video file
                <video className={styles.video} src={source} controls preload="metadata" key={source} />
            ) : (
                <div className={styles.videoPlaceholder} role="img" aria-label={t('home.video.placeholder')}>
                    <span className={styles.playButton} aria-hidden>
                        <PlayArrowRounded fontSize="inherit" />
                    </span>
                    <span className={styles.videoPlaceholderText}>{t('home.video.placeholder')}</span>
                </div>
            )}
            <p className={styles.cardText}>{t('home.video.text')}</p>
        </section>
    );
};
