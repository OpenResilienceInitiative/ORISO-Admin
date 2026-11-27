import styles from './styles.module.scss';

/** The columns a raster tile spans, read from the CardGrid's own style module instead of class-name text. */
export const spanOf = (item: Element): 1 | 2 | 3 => {
    if (item.classList.contains(styles.span3)) return 3;
    if (item.classList.contains(styles.span2)) return 2;
    return 1;
};
