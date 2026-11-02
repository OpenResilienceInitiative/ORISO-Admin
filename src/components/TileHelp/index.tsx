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

const TileHelpDialog = ({ topic: firstTopic, onClose }: { topic: TileHelpTopic; onClose: () => void }) => {
    const { t } = useTranslation();
    const [trail, setTrail] = useState<TileHelpTopic[]>([firstTopic]);
    const [index, setIndex] = useState(0);
    const topic = trail[trail.length - 1];
    const slide = topic.slides[index];
    const isFirst = index === 0;
    const isLast = index === topic.slides.length - 1;

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
            title={t(topic.titleKey)}
            description={t(topic.essenceKey)}
            width={720}
            onClose={onClose}
            footer={
                <div className={styles.controls}>
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
            <div className={styles.slide} onKeyDown={handleKeyDown} data-tile-help-slide={slide.id}>
                {slide.visual && <div className={styles.visual}>{slide.visual}</div>}
                <h3 className={styles.slideTitle}>{t(slide.titleKey)}</h3>
                <p className={styles.slideBody}>{t(slide.bodyKey)}</p>
                {slide.example && (
                    <figure className={styles.example}>
                        <figcaption>{t('tileHelp.example')}</figcaption>
                        <div inert>{slide.example}</div>
                    </figure>
                )}
                {isLast && (Boolean(topic.related?.length) || trail.length > 1) && (
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
        </Modal>
    );
};

/** The info button every tile can carry. Opens the explanation of the tile as a slideshow. */
export const TileHelpButton = ({ topic, tileTitle }: { topic: TileHelpTopic; tileTitle: string }) => {
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
            {isOpen && <TileHelpDialog topic={topic} onClose={() => setIsOpen(false)} />}
        </>
    );
};
