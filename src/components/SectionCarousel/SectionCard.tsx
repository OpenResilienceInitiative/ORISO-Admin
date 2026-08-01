import type { ReactNode } from 'react';
import classNames from 'classnames';
import styles from './sectionCarousel.module.scss';

export interface SectionCardProps {
    /** Section name, shown under the artwork. */
    label: string;
    /** Artwork source. Without it the card falls back to {@link SectionCardProps.icon}. */
    image?: string;
    /** Section glyph, drawn on a tonal surface whenever there is no artwork. */
    icon?: ReactNode;
    /** Selected section — keeps full colour while its siblings dim. */
    selected?: boolean;
    /** Drained of colour because a *different* section is selected. */
    dimmed?: boolean;
    lang?: string;
}

/**
 * One section of the current screen, as a 96×96 artwork tile with its name
 * underneath (Figma 61436:17415). Both halves carry the meaning — the artwork
 * is what the eye finds, the label is what says which section it is — so the
 * selected/dimmed treatment always applies to the pair, never to the picture
 * alone.
 *
 * `image` is optional on purpose: sections without artwork show their icon on a
 * tonal surface rather than a hole in the carousel.
 */
export const SectionCard = ({ dimmed = false, icon, image, label, lang, selected = false }: SectionCardProps) => (
    <span className={classNames(styles.card, { [styles.cardDimmed]: dimmed, [styles.cardSelected]: selected })}>
        <span className={styles.thumb}>
            {image ? (
                <img alt="" className={styles.image} loading="lazy" src={image} />
            ) : (
                <span className={styles.fallback} aria-hidden>
                    {icon}
                </span>
            )}
        </span>
        <span className={styles.label} lang={lang}>
            {label}
        </span>
    </span>
);

export default SectionCard;
