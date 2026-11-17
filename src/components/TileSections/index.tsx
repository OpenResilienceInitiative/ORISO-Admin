import classNames from 'classnames';
import { Children, isValidElement, type CSSProperties, type ReactNode } from 'react';
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
    /** Spans every column of the tile, for a panel that reads better wide and short (e.g. a status). */
    wide?: boolean;
    children?: ReactNode;
}

const TileSection = ({
    id,
    title,
    titleAction,
    note,
    footer,
    picture,
    pictureBeside,
    wide,
    children,
}: TileSectionProps) => {
    const headingId = `tile-section-${id}`;

    return (
        <section
            role="group"
            aria-labelledby={headingId}
            className={classNames(styles.section, {
                [styles.sectionBeside]: pictureBeside,
                [styles.sectionWide]: wide,
            })}
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

/**
 * The inside of a wide tile: its topics side by side as white panels. As many columns as fit, one
 * on a phone, so a long tile stays short on a wide screen without any per-page breakpoints. Panels
 * of a row are equally tall; `footer` and `picture` use up what a shorter panel has left.
 */
/**
 * Panels that take one column. A `wide` panel spans the row and never needs a column of its own, so it does not count.
 * `Children.toArray` drops `false`/`null`, so a panel hidden by a condition does not count either.
 */
export const countColumnPanels = (children: ReactNode): number =>
    Children.toArray(children).filter(
        (child) => !(isValidElement<{ wide?: boolean }>(child) && child.type === TileSection && child.props.wide),
    ).length;

const TileSectionsRoot = ({ children, className }: TileSectionsProps) => {
    // Never more columns than there are panels to fill them. Without the cap a `wide` panel keeps every
    // auto-fit column alive, and the row below it shows empty columns beside narrow panels (ORISO-Admin#1543).
    const columns = Math.max(1, countColumnPanels(children));

    return (
        <div
            className={classNames(styles.sections, { [styles.fewColumns]: columns <= 2 }, className)}
            style={{ '--tile-sections-columns': columns } as CSSProperties}
            data-admin-tile-sections
        >
            {children}
        </div>
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
