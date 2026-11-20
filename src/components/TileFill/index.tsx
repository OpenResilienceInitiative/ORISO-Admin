import type { ReactNode } from 'react';
import styles from './styles.module.scss';

/** A transparent drawing. Decorative everywhere: the text next to it has to say it all. */
export const TilePicture = ({ src }: { src: string }) => <img className={styles.image} src={src} alt="" />;

/** A short note with an icon, pinned to the bottom of a tile above its action row. */
export const TileNote = ({ icon, children }: { icon: ReactNode; children: ReactNode }) => (
    <div className={styles.note} data-admin-tile-note>
        {icon}
        <span>{children}</span>
    </div>
);

/**
 * Fills what a tile has left over in its row with the tile's own picture. Shows nothing when
 * the rest is too small or the tile is not in the raster.
 */
export const TileFill = ({ visual }: { visual: ReactNode }) => (
    <div className={styles.fill} aria-hidden data-admin-tile-fill>
        <div className={styles.picture}>{visual}</div>
    </div>
);
