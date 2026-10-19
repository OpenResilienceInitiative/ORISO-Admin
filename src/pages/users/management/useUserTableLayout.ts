import { useEffect, useState, type RefObject } from 'react';

/**
 * wide ≥1280 · compact 1024–1279 · tablet 768–1023 · phone <768 (same split as the bottom bar).
 * Wide fits 1280 since username and the "Auch …" mark live in the person cell.
 */
export type UserTableLayout = 'wide' | 'compact' | 'tablet' | 'phone';

const QUERIES: [UserTableLayout, string][] = [
    ['phone', '(max-width: 767px)'],
    ['tablet', '(max-width: 1023px)'],
    ['compact', '(max-width: 1279px)'],
];

const read = (): UserTableLayout =>
    typeof window === 'undefined' || typeof window.matchMedia !== 'function'
        ? 'wide'
        : QUERIES.find(([, query]) => window.matchMedia(query).matches)?.[0] ?? 'wide';

// Measured content bands preserve the fitting 1280/1024px viewport references
// after the 128px navigation rail and 168px page gutters have taken their space.
const containerLayout = (width: number): UserTableLayout => {
    if (width < 600) return 'phone';
    if (width < 728) return 'tablet';
    if (width < 984) return 'compact';
    return 'wide';
};

export const useUserTableLayout = (container?: RefObject<HTMLElement | null>): UserTableLayout => {
    const [layout, setLayout] = useState(read);
    const [width, setWidth] = useState<number>();

    useEffect(() => {
        const element = container?.current;
        if (!element || typeof ResizeObserver === 'undefined') return undefined;
        const observer = new ResizeObserver(([entry]) => {
            if (entry?.contentRect.width > 0) setWidth(entry.contentRect.width);
        });
        observer.observe(element);
        return () => observer.disconnect();
    }, [container]);

    useEffect(() => {
        if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
        const lists = QUERIES.map(([, query]) => window.matchMedia(query));
        const update = () => setLayout(read());
        update();
        lists.forEach((list) => list.addEventListener('change', update));
        return () => lists.forEach((list) => list.removeEventListener('change', update));
    }, []);

    return width == null ? layout : containerLayout(width);
};
