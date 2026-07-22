import type { CSSProperties, ReactNode } from 'react';
import classNames from 'classnames';
import styles from './styles.module.scss';

export interface FieldGridProps {
    children: ReactNode;
    /**
     * Minimum width (px) a column may shrink to before the grid drops to fewer
     * columns. This is THE layout floor: content never gets squished below it —
     * it wraps into the next-smaller column count instead, down to a single
     * stacked column on mobile.
     */
    minColumnWidth?: number;
    /** Upper bound for how many columns tall content may spread into. Default 3. */
    maxColumns?: number;
    className?: string;
}

/**
 * Container-driven responsive column layout for card bodies and create flows.
 *
 * Replaces per-page hardcoded widths (antd Row/Col spans, ad-hoc min-widths):
 * children flow into as many columns as fit — each at least `minColumnWidth`,
 * at most `maxColumns` — and stack vertically once the container is narrower
 * than one column. No media queries; the container width alone decides.
 *
 * Wide content (rich-text editors, tables) opts out of the column raster with
 * `<FieldGrid.Wide>`, spanning the full row.
 */
export const FieldGrid = ({ children, minColumnWidth = 280, maxColumns = 3, className }: FieldGridProps) => (
    <div
        className={classNames(styles.grid, className)}
        style={
            {
                '--field-grid-min': `${minColumnWidth}px`,
                '--field-grid-max-columns': maxColumns,
            } as CSSProperties
        }
    >
        {children}
    </div>
);

const Wide = ({ children, className }: { children: ReactNode; className?: string }) => (
    <div className={classNames(styles.wide, className)}>{children}</div>
);

FieldGrid.Wide = Wide;

export default FieldGrid;
