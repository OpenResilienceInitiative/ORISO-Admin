import type { FC, SVGProps } from 'react';

/**
 * Canonical anonymous animal avatar set (ORISO). Each `.svg` in this folder is a
 * monochrome glyph (fill=black); recolour to currentColor at the render site.
 * Loaded via import.meta.glob so adding an SVG here surfaces it everywhere.
 *
 * The viewBox of every file is cropped to a square around the artwork, with no
 * built-in margin: the renderer alone decides how much of the circle the glyph
 * fills. The original 24×24 canvases left a third of their width empty, so the
 * motifs looked "fummelig klein" in their tiles (owner, 2026-09-24). A new file
 * added here should follow the same convention.
 */
export interface AnimalAvatar {
    id: string;
    Icon: FC<SVGProps<SVGSVGElement>>;
}

const modules = import.meta.glob('./*.svg', {
    eager: true,
    import: 'ReactComponent',
}) as Record<string, FC<SVGProps<SVGSVGElement>>>;

export const ANIMAL_AVATARS: AnimalAvatar[] = Object.entries(modules)
    .map(([path, Icon]) => ({
        id: path.split('/').pop()?.replace('.svg', '') ?? path,
        Icon,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
