import type { CSSProperties, ReactNode } from 'react';
import classNames from 'classnames';
import styles from './styles.module.scss';

export interface CardGridProps {
    children: ReactNode;
    /**
     * Layout floor for a single card: below this width a card no longer shares
     * a row — it wraps onto the next row instead of squishing. A row holding
     * just one card is fine by design.
     */
    minCardWidth?: number;
    /** Upper bound for cards per row. Default 3. */
    maxColumns?: number;
    className?: string;
}

/**
 * The card-level sibling of FieldGrid — one wrapper logic for whole pages:
 * wizard steps / settings cards sit side by side while they fit, wrap onto the
 * next row when they would drop under `minCardWidth`, and stack to a single
 * column on mobile. The page's fixed zones (search field + tab section above,
 * footer below) are never squeezed — cards yield by wrapping, not shrinking.
 *
 * Inside each card, FieldGrid applies the same rule to the fields. Use
 * CardDeck instead when a horizontal scroller is explicitly wanted.
 */
export const CardGrid = ({ children, minCardWidth = 400, maxColumns = 3, className }: CardGridProps) => (
    <div
        className={classNames(styles.cardGrid, className)}
        style={
            {
                '--field-grid-min': `${minCardWidth}px`,
                '--field-grid-max-columns': maxColumns,
            } as CSSProperties
        }
    >
        {children}
    </div>
);

export default CardGrid;
