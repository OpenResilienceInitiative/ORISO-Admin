import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import classNames from 'classnames';
import { TileFill, TilePicture } from '../TileFill';
import conversationPicture from '../../resources/img/tile-help/conversation.webp';
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
    /**
     * The settings raster: three columns, two or one depending on the room the grid
     * has. Tiles sit in `CardGrid.Item`, may span columns, stretch to the height of
     * their row, and show a small graphic in free space. `minCardWidth` and
     * `maxColumns` do not apply.
     */
    raster?: boolean;
    className?: string;
}

interface CardGridItemProps {
    children: ReactNode;
    /** Columns this tile takes while the grid has that many. Default 1. */
    span?: 1 | 2 | 3;
    className?: string;
}

const CardGridItem = ({ children, span = 1, className }: CardGridItemProps) => (
    <div
        className={classNames(styles.item, { [styles.span2]: span === 2, [styles.span3]: span === 3 }, className)}
        data-admin-card-grid-item
    >
        {children}
    </div>
);

interface FreeCells {
    row: number;
    column: number;
    span: number;
}

/**
 * The cells no tile takes. Which tiles a role sees and how many columns fit decides where
 * they are, so they are measured instead of written into every page.
 */
const measureFreeCells = (grid: HTMLElement): FreeCells[] => {
    const { columnGap, gridTemplateColumns } = getComputedStyle(grid);
    const columns = gridTemplateColumns.split(' ').filter(Boolean);
    if (columns.length < 2) return [];

    const step = Number.parseFloat(columns[0]) + (Number.parseFloat(columnGap) || 0);
    const gridLeft = grid.getBoundingClientRect().left;
    const taken = new Map<number, Set<number>>();
    grid.querySelectorAll<HTMLElement>(':scope > [data-admin-card-grid-item]').forEach((tile) => {
        const { top, left, width } = tile.getBoundingClientRect();
        const first = Math.round((left - gridLeft) / step);
        const span = Math.max(1, Math.round((width + step - Number.parseFloat(columns[0])) / step));
        const row = taken.get(Math.round(top)) ?? new Set<number>();
        for (let column = first; column < first + span; column += 1) row.add(column);
        taken.set(Math.round(top), row);
    });

    const free: FreeCells[] = [];
    Array.from(taken.entries())
        .sort(([a], [b]) => a - b)
        .forEach(([, row], rowIndex) => {
            for (let column = 0; column < columns.length; column += 1) {
                if (!row.has(column)) {
                    const last = free[free.length - 1];
                    if (last?.row === rowIndex + 1 && last.column + last.span === column + 1) last.span += 1;
                    else free.push({ row: rowIndex + 1, column: column + 1, span: 1 });
                }
            }
        });
    return free;
};

const useFreeCells = () => {
    const gridRef = useRef<HTMLDivElement>(null);
    const [freeCells, setFreeCells] = useState<FreeCells[]>([]);

    useLayoutEffect(() => {
        const grid = gridRef.current;
        if (!grid) return undefined;
        const measure = () => {
            const next = measureFreeCells(grid);
            setFreeCells((current) => (JSON.stringify(current) === JSON.stringify(next) ? current : next));
        };
        measure();
        if (typeof ResizeObserver === 'undefined') return undefined;
        const observer = new ResizeObserver(measure);
        observer.observe(grid);
        return () => observer.disconnect();
    }, []);

    return { gridRef, freeCells };
};

const CardGridRaster = ({ children, className }: Pick<CardGridProps, 'children' | 'className'>) => {
    const { gridRef, freeCells } = useFreeCells();

    return (
        <div className={styles.rasterHost} data-admin-card-raster>
            <div ref={gridRef} data-admin-card-grid className={classNames(styles.raster, className)}>
                {children}
                {freeCells.map(({ row, column, span }) => (
                    <div
                        key={`${row}-${column}`}
                        className={styles.filler}
                        style={{ gridRow: row, gridColumn: `${column} / span ${span}` }}
                    >
                        <TileFill visual={<TilePicture src={conversationPicture} />} />
                    </div>
                ))}
            </div>
        </div>
    );
};

/**
 * The card-level sibling of FieldGrid — one wrapper logic for whole pages:
 * wizard steps / settings cards sit side by side while they fit, wrap onto the
 * next row when they would drop under `minCardWidth`, and stack to a single
 * column on mobile. The page's fixed zones (search field + tab section above,
 * footer below) are never squeezed — cards yield by wrapping, not shrinking.
 *
 * Inside each card, FieldGrid applies the same rule to the fields.
 */
const CardGridRoot = ({ children, minCardWidth = 400, maxColumns = 3, raster, className }: CardGridProps) =>
    raster ? (
        <CardGridRaster className={className}>{children}</CardGridRaster>
    ) : (
        <div
            data-admin-card-grid
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

export const CardGrid = Object.assign(CardGridRoot, { Item: CardGridItem });

export default CardGrid;
