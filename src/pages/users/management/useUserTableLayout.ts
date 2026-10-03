import { useEffect, useState } from 'react';

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

export const useUserTableLayout = (): UserTableLayout => {
    const [layout, setLayout] = useState(read);

    useEffect(() => {
        if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
        const lists = QUERIES.map(([, query]) => window.matchMedia(query));
        const update = () => setLayout(read());
        update();
        lists.forEach((list) => list.addEventListener('change', update));
        return () => lists.forEach((list) => list.removeEventListener('change', update));
    }, []);

    return layout;
};
