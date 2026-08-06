import type { ReactNode } from 'react';
import classNames from 'classnames';
import styles from './styles.module.scss';

export interface AvatarOption {
    id: string;
    /** The avatar glyph/icon. */
    node: ReactNode;
    label?: string;
}

export interface AvatarPickerGridProps {
    avatars: AvatarOption[];
    value?: string;
    onChange?: (id: string) => void;
    columns?: number;
    className?: string;
}

/**
 * M3 avatar picker (Figma Admin.ORISO — Avatar & Name 1-34788): a grid of
 * circular, single-select avatar tiles. Selection draws a primary ring.
 */
export const AvatarPickerGrid = ({ avatars, value, onChange, columns = 5, className }: AvatarPickerGridProps) => (
    <div
        className={classNames(styles.grid, className)}
        style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
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
