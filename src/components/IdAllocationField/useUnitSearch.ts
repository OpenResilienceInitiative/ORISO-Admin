import { useEffect, useRef, useState } from 'react';
import type { IdUnitOption } from './useIdAllocation';

/** One page of a paged type-ahead search; `page` is the last server page the reply read. */
export interface IdUnitSearchPage {
    units: IdUnitOption[];
    hasMore: boolean;
    total?: number;
    page?: number;
}

type IdUnitSearchResult = IdUnitOption[] | IdUnitSearchPage;

/** A plain list is final; a page with `hasMore` makes the menu offer "Weitere anzeigen". `signal` aborts on a newer query. */
export type IdUnitSearch = (
    query: string,
    page?: number,
    signal?: AbortSignal,
) => Promise<IdUnitSearchResult> | IdUnitSearchResult;

const asPage = (result: IdUnitSearchResult): IdUnitSearchPage =>
    Array.isArray(result) ? { units: result, hasMore: false } : result;

const DIGITS = /^\d+$/;
export const SEARCH_DEBOUNCE_MS = 150;

interface UseUnitSearchOptions {
    searchUnits?: IdUnitSearch;
    resolveUnit?: (id: number) => Promise<IdUnitOption | null>;
    open: boolean;
    query: string;
    /** Existing-only fields take a typed number once it resolves; create fields check it instead. */
    allowCreate: boolean;
    acceptTypedIds: boolean;
    /** A number the allocation check called taken: look it up so the menu can offer that unit. */
    assignedId?: number;
    onTypedUnit: (unit: IdUnitOption) => void;
    /** A typed number with no unit behind it: an earlier pick must not stay selected (9 before 90). */
    onTypedMiss?: () => void;
}

// The ID field's paged search and number lookups; `typedUnit`/`assignedUnit`: undefined = not looked up, null = none.
export const useUnitSearch = ({
    searchUnits,
    resolveUnit,
    open,
    query,
    allowCreate,
    acceptTypedIds,
    assignedId,
    onTypedUnit,
    onTypedMiss,
}: UseUnitSearchOptions) => {
    const [results, setResults] = useState<IdUnitOption[]>([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [total, setTotal] = useState<number | undefined>();
    // True from a new query until its first page lands, so the field shows neither stale pages nor "no match".
    const [searching, setSearching] = useState(false);
    const [resolved, setResolved] = useState<{ id: number; unit: IdUnitOption | null } | undefined>();

    // Every new query or close bumps the token; a reply only lands while its token is current.
    const searchToken = useRef(0);
    const searchAbort = useRef<AbortController | null>(null);
    const loadingMore = useRef(false);
    const lookupToken = useRef(0);

    const trimmed = query.trim();
    const typedId = acceptTypedIds && DIGITS.test(trimmed) ? Number(trimmed) : undefined;

    useEffect(() => {
        if (!open || !searchUnits) return undefined;
        searchToken.current += 1;
        const token = searchToken.current;
        loadingMore.current = false;
        // The old query's pages must go now: "more" would otherwise ask the new query for a later page.
        setResults([]);
        setPage(1);
        setHasMore(false);
        setTotal(undefined);
        setSearching(true);
        const controller = new AbortController();
        searchAbort.current = controller;
        const timer = window.setTimeout(() => {
            Promise.resolve(searchUnits(trimmed, 1, controller.signal))
                .then((found) => {
                    if (token !== searchToken.current) return;
                    const first = asPage(found);
                    setResults(first.units);
                    setPage(first.page ?? 1);
                    setHasMore(first.hasMore);
                    setTotal(first.total);
                    setSearching(false);
                })
                .catch(() => {
                    if (token !== searchToken.current) return;
                    setResults([]);
                    setHasMore(false);
                    setTotal(undefined);
                    setSearching(false);
                });
        }, SEARCH_DEBOUNCE_MS);
        return () => {
            searchToken.current += 1;
            window.clearTimeout(timer);
            controller.abort();
        };
    }, [open, trimmed, searchUnits]);

    const loadMore = () => {
        // Nothing to add while the first page of a new query is pending, or when the server said "no more".
        if (!searchUnits || loadingMore.current || searching || !hasMore) return;
        loadingMore.current = true;
        const token = searchToken.current;
        const nextPage = page + 1;
        Promise.resolve(searchUnits(trimmed, nextPage, searchAbort.current?.signal))
            .then((found) => {
                if (token !== searchToken.current) return;
                const next = asPage(found);
                setResults((previous) => {
                    const known = new Set(previous.map((option) => option.id));
                    return [...previous, ...next.units.filter((option) => !known.has(option.id))];
                });
                setPage(next.page ?? nextPage);
                setHasMore(next.hasMore);
                setTotal((current) => next.total ?? current);
            })
            .catch(() => {
                if (token === searchToken.current) setHasMore(false);
            })
            .finally(() => {
                if (token === searchToken.current) loadingMore.current = false;
            });
    };

    const lookUpTyped = (id: number) => {
        if (!resolveUnit) return;
        lookupToken.current += 1;
        const token = lookupToken.current;
        resolveUnit(id)
            .catch(() => null)
            .then((found) => {
                if (token !== lookupToken.current) return;
                setResolved({ id, unit: found });
                if (found) onTypedUnit(found);
                else onTypedMiss?.();
            });
    };

    useEffect(() => {
        if (!open) return undefined;
        // A keystroke makes an older lookup stale; closing does not, so a settling lookup still lands.
        lookupToken.current += 1;
        if (allowCreate || typedId === undefined || !resolveUnit) return undefined;
        const timer = window.setTimeout(() => lookUpTyped(typedId), SEARCH_DEBOUNCE_MS);
        return () => window.clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, allowCreate, trimmed, resolveUnit]);

    useEffect(() => {
        if (!allowCreate || assignedId === undefined || !resolveUnit) return undefined;
        let current = true;
        resolveUnit(assignedId)
            .catch(() => null)
            .then((found) => {
                if (current) setResolved({ id: assignedId, unit: found });
            });
        return () => {
            current = false;
        };
    }, [allowCreate, assignedId, resolveUnit]);

    const resolvedFor = (id: number | undefined) =>
        id !== undefined && resolved?.id === id ? resolved.unit : undefined;

    return {
        results,
        hasMore,
        total,
        searching,
        loadMore,
        typedId,
        typedUnit: resolvedFor(typedId),
        assignedUnit: resolvedFor(assignedId) ?? null,
        /** Leaving the field right after typing a number must not drop its lookup. */
        settleTyped: () => {
            if (!allowCreate && typedId !== undefined && resolved?.id !== typedId) lookUpTyped(typedId);
        },
    };
};
