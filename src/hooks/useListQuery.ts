import { useCallback } from 'react';
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
