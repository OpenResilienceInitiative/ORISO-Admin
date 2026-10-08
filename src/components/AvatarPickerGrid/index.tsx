import type { ReactNode } from 'react';
import classNames from 'classnames';
import styles from './styles.module.scss';

export interface AvatarOption {
    id: string;
    /** The avatar glyph/icon, or a short text (the INITIALS tile). */
    node: ReactNode;
    label?: string;
}

export interface AvatarPickerGridProps {
    avatars: AvatarOption[];
    value?: string;
    onChange?: (id: string) => void;
    /**
     * Fixed number of stretched columns. Omitted (the default) the grid PACKS
     * instead: as many 52px tiles per row as the container fits, left-aligned.
     * Stretching five tiles across a wide form left ~160px of dead space
     * between neighbours (owner, 2026-09-17).
     */
    columns?: number;
    className?: string;
}

/**
 * M3 avatar picker (Figma Admin.ORISO — Avatar & Name 1-34788): a grid of
 * circular, single-select avatar tiles. Selection draws a ring.
 *
 * The grid packs by default — `repeat(auto-fill, 52px)` left-aligned — so the
 * circles sit close together at any width instead of being spread across the
 * form. Pass `columns` only where a fixed, stretched column count is wanted.
 */
export const AvatarPickerGrid = ({ avatars, value, onChange, columns, className }: AvatarPickerGridProps) => (
    <div
        className={classNames(styles.grid, className)}
        style={columns ? { gridTemplateColumns: `repeat(${columns}, 1fr)` } : undefined}
        role="radiogroup"
    >
        {avatars.map((avatar) => (
            <button
                key={avatar.id}
                type="button"
                role="radio"
                aria-checked={value === avatar.id}
                aria-label={avatar.label ?? avatar.id}
                className={classNames(styles.avatar, { [styles.selected]: value === avatar.id })}
                onClick={() => onChange?.(avatar.id)}
            >
                {avatar.node}
            </button>
        ))}
    </div>
);
