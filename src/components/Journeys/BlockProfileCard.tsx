import { useId, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import SellOutlined from '@mui/icons-material/SellOutlined';
import { MODULE_SOURCE_LANGUAGE } from '../ConversationModules/conversationModule';
import { keywordsIn, type BlockProfile } from './journey';
import styles from './styles.module.scss';

interface BlockProfileCardProps {
    /** "Frage", "Core", … */
    kind: string;
    /** What the platform says about this kind of block. */
    help: string;
    profile?: BlockProfile;
    /** Further lines under the help text (e.g. the split button). */
    children?: ReactNode;
    /** Opens the profile card and its search terms. */
    onEdit?: () => void;
}

/**
 * What a block is for, at a glance: the platform's help, and — once written — the profile card
 * (goal, author, audiences, a few German search terms). Editing happens in its own dialog.
 */
export const BlockProfileCard = ({ kind, help, profile, children, onEdit }: BlockProfileCardProps) => {
    const { t } = useTranslation();
    const headingId = useId();
    const terms = keywordsIn(profile, MODULE_SOURCE_LANGUAGE);

    return (
        <aside className={styles.about} aria-labelledby={headingId} data-testid="journey-step-about">
            <span className={styles.aboutIcon} aria-hidden>
                <InfoOutlined />
            </span>
            <div className={styles.aboutText}>
                <p className={styles.aboutTitle} id={headingId}>
                    {t('journeys.stepDialog.about', { kind })}
                </p>
                <p>{profile?.about || help}</p>
                {profile && (profile.goal || profile.author || profile.audiences.length > 0 || terms.length > 0) && (
                    <dl className={styles.profileFacts}>
                        {profile.goal && (
                            <>
                                <dt>{t('journeys.profile.goal')}</dt>
                                <dd>{profile.goal}</dd>
                            </>
                        )}
                        {profile.author && (
                            <>
                                <dt>{t('journeys.profile.author')}</dt>
                                <dd>{profile.author}</dd>
                            </>
                        )}
                        {profile.audiences.length > 0 && (
                            <>
                                <dt>{t('journeys.profile.audiences')}</dt>
                                <dd>
                                    {profile.audiences.map((audience) => t(`journeys.audience.${audience}`)).join(', ')}
                                </dd>
                            </>
                        )}
                        {terms.length > 0 && (
                            <>
                                <dt>{t('journeys.profile.keywords')}</dt>
                                <dd className={styles.profileTags}>
                                    {terms.map((entry) => (
                                        <span key={entry} className={styles.chip}>
                                            {entry}
                                        </span>
                                    ))}
                                </dd>
                            </>
                        )}
                    </dl>
                )}
                {children}
                {onEdit && (
                    <div>
                        <button type="button" className={styles.profileToggle} onClick={onEdit}>
                            <SellOutlined aria-hidden />
                            {t('journeys.profileDialog.open')}
                        </button>
                    </div>
                )}
            </div>
        </aside>
    );
};
