import { useId, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import Add from '@mui/icons-material/Add';
import Close from '@mui/icons-material/Close';
import ExpandMore from '@mui/icons-material/ExpandMore';
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import { FloatingLabelInput } from '../FloatingLabelInput';
import { FilterChip } from '../FilterChip';
import { IconButton } from '../IconButton';
import { AUDIENCES, addTag, emptyProfile, type Audience, type BlockProfile } from './journey';
import styles from './styles.module.scss';

interface BlockProfileCardProps {
    /** "Frage", "Core", … */
    kind: string;
    /** What the platform says about this kind of block. */
    help: string;
    profile?: BlockProfile;
    /** Prefilled author of a new profile card, e.g. "Plattform". */
    defaultAuthor: string;
    /** Further lines under the help text (e.g. the split button). */
    children?: ReactNode;
    onChange: (profile: BlockProfile) => void;
}

/**
 * The profile card of a block, for other editors: what it is for, what it should achieve, who made
 * it, for whom, and keywords to find it. It is never shown to the advice seeker. Collapsed it is a
 * summary; opened it is a small form.
 */
export const BlockProfileCard = ({ kind, help, profile, defaultAuthor, children, onChange }: BlockProfileCardProps) => {
    const { t } = useTranslation();
    const headingId = useId();
    const formId = useId();
    const [open, setOpen] = useState(false);
    const [tag, setTag] = useState('');
    const card = profile ?? emptyProfile(defaultAuthor);
    const set = (patch: Partial<BlockProfile>) => onChange({ ...card, ...patch });
    const toggleAudience = (audience: Audience, on: boolean) =>
        set({ audiences: on ? [...card.audiences, audience] : card.audiences.filter((entry) => entry !== audience) });
    const commitTag = () => {
        onChange(addTag(card, tag));
        setTag('');
    };

    return (
        <aside className={styles.about} aria-labelledby={headingId} data-testid="journey-step-about">
            <span className={styles.aboutIcon} aria-hidden>
                <InfoOutlined />
            </span>
            <div className={styles.aboutText}>
                <p className={styles.aboutTitle} id={headingId}>
                    {t('journeys.stepDialog.about', { kind })}
                </p>
                <p>{card.about || help}</p>
                {(card.goal || card.author || card.audiences.length > 0 || card.tags.length > 0) && (
                    <dl className={styles.profileFacts}>
                        {card.goal && (
                            <>
                                <dt>{t('journeys.profile.goal')}</dt>
                                <dd>{card.goal}</dd>
                            </>
                        )}
                        {card.author && (
                            <>
                                <dt>{t('journeys.profile.author')}</dt>
                                <dd>{card.author}</dd>
                            </>
                        )}
                        {card.audiences.length > 0 && (
                            <>
                                <dt>{t('journeys.profile.audiences')}</dt>
                                <dd>
                                    {card.audiences.map((audience) => t(`journeys.audience.${audience}`)).join(', ')}
                                </dd>
                            </>
                        )}
                        {card.tags.length > 0 && (
                            <>
                                <dt>{t('journeys.profile.tags')}</dt>
                                <dd className={styles.profileTags}>
                                    {card.tags.map((entry) => (
                                        <span key={entry} className={styles.chip}>
                                            #{entry}
                                        </span>
                                    ))}
                                </dd>
                            </>
                        )}
                    </dl>
                )}
                {children}
                <div>
                    <button
                        type="button"
                        className={styles.profileToggle}
                        aria-expanded={open}
                        aria-controls={formId}
                        onClick={() => setOpen((current) => !current)}
                    >
                        <ExpandMore aria-hidden style={{ transform: open ? 'rotate(180deg)' : undefined }} />
                        {t('journeys.profile.edit')}
                    </button>
                </div>
                {open && (
                    <div className={styles.profileForm} id={formId} data-testid="journey-step-profile">
                        <p>{t('journeys.profile.hint')}</p>
                        <FloatingLabelInput
                            label={t('journeys.profile.about')}
                            value={card.about}
                            onChange={(event) => set({ about: event.target.value })}
                        />
                        <FloatingLabelInput
                            label={t('journeys.profile.goal')}
                            value={card.goal}
                            onChange={(event) => set({ goal: event.target.value })}
                        />
                        <FloatingLabelInput
                            label={t('journeys.profile.author')}
                            value={card.author}
                            onChange={(event) => set({ author: event.target.value })}
                        />
                        <div className={styles.section}>
                            <span className={styles.chipsLabel} id={`${formId}-audiences`}>
                                {t('journeys.profile.audiences')}
                            </span>
                            <div className={styles.looks} role="group" aria-labelledby={`${formId}-audiences`}>
                                {AUDIENCES.map((audience) => (
                                    <FilterChip
                                        key={audience}
                                        label={t(`journeys.audience.${audience}`)}
                                        selected={card.audiences.includes(audience)}
                                        onChange={(on) => toggleAudience(audience, on)}
                                    />
                                ))}
                            </div>
                        </div>
                        <div className={styles.section}>
                            <div className={styles.tagInput}>
                                <FloatingLabelInput
                                    label={t('journeys.profile.tags')}
                                    supportingText={t('journeys.profile.tagsHelp')}
                                    value={tag}
                                    onChange={(event) => setTag(event.target.value)}
                                    onKeyDown={(event) => {
                                        if (event.key !== 'Enter') return;
                                        event.preventDefault();
                                        commitTag();
                                    }}
                                />
                                <IconButton
                                    icon={<Add />}
                                    ariaLabel={t('journeys.profile.addTag')}
                                    disabled={!tag.trim()}
                                    onClick={commitTag}
                                />
                            </div>
                            {card.tags.length > 0 && (
                                <ul className={styles.chips} aria-label={t('journeys.profile.tags')}>
                                    {card.tags.map((entry) => (
                                        <li key={entry} className={styles.chip}>
                                            #{entry}
                                            <button
                                                type="button"
                                                className={styles.chipRemove}
                                                aria-label={t('journeys.profile.removeTag', { tag: entry })}
                                                onClick={() =>
                                                    set({ tags: card.tags.filter((other) => other !== entry) })
                                                }
                                            >
                                                <Close aria-hidden />
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </aside>
    );
};
