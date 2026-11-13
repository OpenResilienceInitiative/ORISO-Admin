import { useCallback, useState, type SetStateAction } from 'react';
import { useSearchParams } from 'react-router-dom';

/** The URL parameter a list reads its name search from (`/admin/tenants?q=caritas`). */
export const LIST_QUERY_PARAM = 'q';

/** A list address that opens already narrowed to `query` (used by the admin search, ⌘K). */
export const listPathWithQuery = (path: string, query: string) => {
    const trimmed = query.trim();

    return trimmed ? `${path}?${new URLSearchParams({ [LIST_QUERY_PARAM]: trimmed })}` : path;
};

/**
 * The name search of a list page. The lists have no search field of their own any more: the
 * admin search (⌘K) is the one place to type, and its "Show all in the list" opens the list with
 * `?q=`. The query lives in the URL, so back/forward and a shared link keep it.
 */
export const useListQuery = () => {
    const [params, setParams] = useSearchParams();
    const query = params.get(LIST_QUERY_PARAM)?.trim() ?? '';
    const clear = useCallback(
        () =>
            setParams(
                (current) => {
                    const next = new URLSearchParams(current);
                    next.delete(LIST_QUERY_PARAM);
                    return next;
                },
                { replace: true },
            ),
        [setParams],
    );

    return { query, clear };
};

/**
 * Table state (page, size, sort) of a list narrowed by `query`. The page belongs to the query it was
 * picked for: once the query changes, the state reads page 1 in that same render. Resetting it in an
 * effect instead lets the list ask once for the old page with the new query, which is usually empty
 * and flashes "no results". The setter is stable, like the one of `useState`.
 */
export const useListTableState = <T extends { current?: number }>(query: string, initial: T) => {
    const [stored, setStored] = useState({ query, state: initial });
    const state = stored.query === query ? stored.state : { ...stored.state, current: 1 };

    // Adjusting state while rendering (React: "storing information from previous renders"): React
    // renders again at once, before anything reaches the screen or an effect runs.
    if (stored.query !== query) setStored({ query, state });

    const setState = useCallback(
        (update: SetStateAction<T>) =>
            setStored((previous) => ({
                query: previous.query,
                state: typeof update === 'function' ? update(previous.state) : update,
            })),
        [],
    );

    return [state, setState] as const;
};
