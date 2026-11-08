import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import IconButton from '@mui/material/IconButton';
import type { KeyboardEvent, ReactNode } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { M3Button } from '../M3Button';
import { Modal } from '../Modal';
import styles from './styles.module.scss';

export interface TileHelpSlide {
    id: string;
    titleKey: string;
    bodyKey: string;
    /** A drawing. Decorative: the text below has to say it all. */
    visual?: ReactNode;
    /** A real element of the admin, shown inert with a label, so people recognise it later. */
    example?: ReactNode;
}

export interface TileHelpTopic {
    id: string;
    titleKey: string;
    /** The one sentence that remains when everything else is cut; also the short help. */
    essenceKey: string;
    slides: TileHelpSlide[];
    /** Topics several tiles share (password, second factor) are written once and linked. */
    related?: TileHelpTopic[];
}

interface TileHelpDialogProps {
    topic: TileHelpTopic;
    /** The icon of the tile the help belongs to; shown in the header and as the stand-in picture. */
    tileIcon?: ReactNode;
    onClose: () => void;
}

const TileHelpDialog = ({ topic: firstTopic, tileIcon, onClose }: TileHelpDialogProps) => {
    const { t } = useTranslation();
    const [trail, setTrail] = useState<TileHelpTopic[]>([firstTopic]);
    const [index, setIndex] = useState(0);
    const topic = trail[trail.length - 1];
    const slide = topic.slides[index];
    const isFirst = index === 0;
    const isLast = index >= topic.slides.length - 1;
    const hasSteps = topic.slides.length > 1;

    const openTopic = (next: TileHelpTopic[]) => {
        setTrail(next);
        setIndex(0);
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key === 'ArrowRight' && !isLast) setIndex(index + 1);
        if (event.key === 'ArrowLeft' && !isFirst) setIndex(index - 1);
    };

    return (
        <Modal
            title={
                <span className={styles.heading}>
                    <span className={styles.headingIcon} aria-hidden data-tile-help-icon>
                        {tileIcon ?? <InfoOutlinedIcon />}
                    </span>
                    <span>{t(topic.titleKey)}</span>
                </span>
            }
            description={t(topic.essenceKey)}
            width={720}
            className={styles.dialog}
            onClose={onClose}
            footer={
                <div className={styles.controls}>
                    {hasSteps && (
                        <>
                            <M3Button
                                variant="text"
                                icon={<ArrowBackIcon />}
                                disabled={isFirst}
                                onClick={() => setIndex(index - 1)}
                            >
                                {t('tileHelp.previous')}
                            </M3Button>
                            <span className={styles.progress} aria-live="polite">
                                {t('tileHelp.progress', { current: index + 1, total: topic.slides.length })}
                            </span>
                        </>
                    )}
                    {isLast ? (
                        <M3Button variant="filled" onClick={onClose}>
                            {t('tileHelp.done')}
                        </M3Button>
                    ) : (
                        <M3Button variant="filled" icon={<ArrowForwardIcon />} onClick={() => setIndex(index + 1)}>
                            {t('tileHelp.next')}
                        </M3Button>
                    )}
                </div>
            }
        >
            {/* The arrow keys move through the slides while the focus is anywhere in here. */}
            {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
            <div className={styles.slide} onKeyDown={handleKeyDown} data-tile-help-slide={slide?.id}>
                {/* Every step keeps the same picture box, so the text and Next never jump. A step
                    without a drawing of its own shows the tile's icon in its place. */}
                <div
                    key={`${topic.id}-${slide?.id}`}
                    className={styles.media}
                    aria-hidden
                    data-tile-help-media={slide?.visual ? 'visual' : 'placeholder'}
                >
                    {slide?.visual ?? (
                        <span className={styles.placeholderIcon}>{tileIcon ?? <InfoOutlinedIcon />}</span>
                    )}
                </div>
                {/* The texts of all steps sit in one grid cell and only the current one shows, so the
                    area is as tall as the longest step and Next stays put. The others are hidden
                    from sight, from the keyboard and from screen readers. */}
                <div className={styles.content}>
                    {topic.slides.map((step, stepIndex) => {
                        const isCurrent = stepIndex === index;
                        const isLastStep = stepIndex === topic.slides.length - 1;
                        return (
                            <div
                                key={step.id}
                                className={styles.step}
                                data-current={isCurrent}
                                aria-hidden={!isCurrent || undefined}
                                inert={!isCurrent}
                            >
                                <h3 className={styles.slideTitle}>{t(step.titleKey)}</h3>
                                <p className={styles.slideBody}>{t(step.bodyKey)}</p>
                                {step.example && (
                                    <figure className={styles.example}>
                                        <figcaption>{t('tileHelp.example')}</figcaption>
                                        <div inert>{step.example}</div>
                                    </figure>
                                )}
                                {isLastStep && (Boolean(topic.related?.length) || trail.length > 1) && (
                                    <div className={styles.related}>
                                        {trail.length > 1 && (
                                            <M3Button variant="outlined" onClick={() => openTopic(trail.slice(0, -1))}>
                                                {t('tileHelp.backTo', { title: t(trail[trail.length - 2].titleKey) })}
                                            </M3Button>
                                        )}
                                        {topic.related?.map((related) => (
                                            <M3Button
                                                key={related.id}
                                                variant="outlined"
                                                onClick={() => openTopic([...trail, related])}
                                            >
                                                {t('tileHelp.seeAlso', { title: t(related.titleKey) })}
                                            </M3Button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </Modal>
    );
};

/** The info button every tile can carry. Opens the explanation of the tile as a slideshow. */
export const TileHelpButton = ({
    topic,
    tileTitle,
    tileIcon,
}: {
    topic: TileHelpTopic;
    tileTitle: string;
    /** The tile's own icon, so the explanation visibly belongs to it. */
    tileIcon?: ReactNode;
}) => {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <IconButton
                className={styles.button}
                aria-label={t('tileHelp.open', { title: tileTitle })}
                aria-haspopup="dialog"
                onClick={() => setIsOpen(true)}
            >
                <InfoOutlinedIcon />
            </IconButton>
            {isOpen && <TileHelpDialog topic={topic} tileIcon={tileIcon} onClose={() => setIsOpen(false)} />}
        </>
    );
};
