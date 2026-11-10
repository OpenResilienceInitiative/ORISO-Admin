import { useEffect, useState, type RefObject } from 'react';

/** wide: every column · tablet: secondary columns fold away, actions move into ⋯ · phone: cards. */
export type ListLayout = 'wide' | 'tablet' | 'phone';

/**
 * Container widths measured per list (docs/responsive-tables.md): below `phoneBelow` the list shows
 * cards, from `wideFrom` the wide row fits without sideways scrolling.
 */
export interface ListBands {
    phoneBelow: number;
    wideFrom: number;
}

export const listLayoutFor = (width: number, { phoneBelow, wideFrom }: ListBands): ListLayout => {
    if (width < phoneBelow) return 'phone';
    if (width < wideFrom) return 'tablet';
    return 'wide';
};

/**
 * Layout of a list from the width of its own container, not the viewport: navigation and page
 * gutters already take their space. Until the first measurement the window width is the guess.
 */
export const useMeasuredListLayout = (container: RefObject<HTMLElement | null>, bands: ListBands): ListLayout => {
    const [width, setWidth] = useState<number>();

    useEffect(() => {
        const element = container.current;
        if (!element || typeof ResizeObserver === 'undefined') return undefined;
        const observer = new ResizeObserver(([entry]) => {
            if (entry?.contentRect.width > 0) setWidth(entry.contentRect.width);
        });
        observer.observe(element);
        return () => observer.disconnect();
    }, [container]);

    const measured = width ?? (typeof window === 'undefined' ? Number.POSITIVE_INFINITY : window.innerWidth);
    return listLayoutFor(measured, bands);
};
