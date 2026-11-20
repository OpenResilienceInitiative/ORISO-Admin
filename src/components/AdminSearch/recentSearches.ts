/**
 * Recent queries, kept in this browser only (a convenience, never state that has
 * to survive: every access is guarded, the search works without it).
 */
const KEY = 'oriso.admin.search.recent';
const MAX = 6;

const read = (): string[] => {
    try {
        const parsed = JSON.parse(window.localStorage.getItem(KEY) ?? '[]');

        return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
    } catch {
        return [];
    }
};

export const getRecentSearches = (): string[] => read();

/** Remembers `query` (most recent first, no duplicates, case-insensitive). */
export const rememberSearch = (query: string): string[] => {
    const value = query.trim();

    if (value.length < 2) {
        return read();
    }

    const next = [value, ...read().filter((item) => item.toLowerCase() !== value.toLowerCase())].slice(0, MAX);

    try {
        window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
        // Private window or blocked storage: the list just stays empty.
    }

    return next;
};

export const forgetSearch = (query: string): string[] => {
    const next = read().filter((item) => item !== query);

    try {
        window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
        // See above.
    }

    return next;
};

export const clearRecentSearches = (): void => {
    try {
        window.localStorage.removeItem(KEY);
    } catch {
        // See above.
    }
};
