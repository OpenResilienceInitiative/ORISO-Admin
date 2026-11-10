import classNames from 'classnames';
import type { ReactNode } from 'react';
import styles from './styles.module.scss';

interface TileSectionsProps {
    children: ReactNode;
    className?: string;
}

interface TileSectionProps {
    /** Unique within the page; names the group for screen readers. */
    id: string;
    title: string;
    /** Sits right of the title, e.g. a small help button. */
    titleAction?: ReactNode;
    /** One sentence under the title. */
    note?: ReactNode;
    /** Pinned to the bottom of the panel, so panels of one row end on the same line. */
    footer?: ReactNode;
    /** Takes the height left over in the panel, and shows only if that is enough to see something. */
    picture?: ReactNode;
    /** Puts the picture right of the content for panels that are wide and short. */
    pictureBeside?: boolean;
    children?: ReactNode;
}

/**
 * The inside of a wide tile: its topics side by side as white panels. As many columns as fit, one
 * on a phone, so a long tile stays short on a wide screen without any per-page breakpoints. Panels
 * of a row are equally tall; `footer` and `picture` use up what a shorter panel has left.
 */
const TileSectionsRoot = ({ children, className }: TileSectionsProps) => (
    <div className={classNames(styles.sections, className)}>{children}</div>
);

const TileSection = ({ id, title, titleAction, note, footer, picture, pictureBeside, children }: TileSectionProps) => {
    const headingId = `tile-section-${id}`;

    return (
        <section
            role="group"
            aria-labelledby={headingId}
            className={classNames(styles.section, { [styles.sectionBeside]: pictureBeside })}
        >
            <div className={styles.main}>
                <div className={styles.heading}>
                    <h3 id={headingId}>{title}</h3>
                    {titleAction}
                </div>
                {note && <p className={styles.note}>{note}</p>}
                {children}
            </div>
            {footer && <div className={styles.footer}>{footer}</div>}
            {picture && (
                <div className={styles.picture} aria-hidden data-admin-tile-section-picture>
                    <div className={styles.pictureFrame}>{picture}</div>
                </div>
            )}
        </section>
    );
};

interface TileSectionStackProps {
    children: ReactNode;
    /**
     * By default the panels of a stack fill a whole row between 752 and 1007 px, which suits a tile whose other
     * panels fill the row before it. A tile with long panels beside it keeps the column at every width.
     */
    keepColumn?: boolean;
}

/** Short topics that share one column, so they do not leave half a row empty. */
const TileSectionStack = ({ children, keepColumn }: TileSectionStackProps) => (
    <div className={classNames(styles.stack, { [styles.stackColumn]: keepColumn })}>{children}</div>
);

export const TileSections = Object.assign(TileSectionsRoot, { Section: TileSection, Stack: TileSectionStack });
