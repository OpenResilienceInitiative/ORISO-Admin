import { useEffect, useState, type RefObject } from 'react';

/**
 * wide: all seven columns · combined: type+id and role+id share a cell · cards: one stacked card per row.
 * Chosen from the width of the list container, not the viewport (docs/responsive-tables.md).
 */
export type DeletionLogLayout = 'wide' | 'combined' | 'cards';

// Measured fit (Chromium, de-DE, widest labels and ids; width of this list's container, i.e. after the
// navigation rail and page gutters): the seven one-line columns need 1335px, the five combined columns
// need 645px (ids wrap inside them). Each bound is rounded up to the next 5-10px so a table never
// overflows by a rounding error. Re-measure when columns change: DeletionAuditLogs.stories.tsx asserts both.
export const WIDE_MIN = 1340;
export const COMBINED_MIN = 650;

export const deletionLogLayoutFor = (width: number): DeletionLogLayout => {
    if (width < COMBINED_MIN) return 'cards';
    if (width < WIDE_MIN) return 'combined';
    return 'wide';
};

// Before the first measurement (and without ResizeObserver) the viewport decides: phones start as cards.
const readViewport = (): DeletionLogLayout =>
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(max-width: 767px)').matches
        ? 'cards'
        : 'wide';

export const useDeletionLogLayout = (container: RefObject<HTMLElement | null>): DeletionLogLayout => {
    const [fallback, setFallback] = useState(readViewport);
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

    useEffect(() => {
        if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
        const list = window.matchMedia('(max-width: 767px)');
        const update = () => setFallback(readViewport());
        list.addEventListener('change', update);
        return () => list.removeEventListener('change', update);
    }, []);

    return width == null ? fallback : deletionLogLayoutFor(width);
};
