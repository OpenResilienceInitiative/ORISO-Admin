import type { FC, SVGProps } from 'react';

/**
 * Canonical anonymous animal avatar set (ORISO). Each `.svg` in this folder is a
 * 24×24 monochrome glyph (fill=black); recolour to currentColor at the render
 * site. Loaded via import.meta.glob so adding an SVG here surfaces it everywhere.
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
