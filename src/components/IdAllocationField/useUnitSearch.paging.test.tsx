import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useUnitSearch } from './useUnitSearch';

describe('useUnitSearch paging across queries', () => {
    it("drops the old query's pages at once, so 'more' never asks the new query for a later page", async () => {
        const searchUnits = vi.fn(async (query: string, page = 1) => ({
            units: [{ id: page * 100 + query.length, name: `${query} ${page}` }],
            hasMore: true,
            total: 30,
            page,
        }));
        const { result, rerender } = renderHook(
            ({ query }) =>
                useUnitSearch({
                    searchUnits,
                    open: true,
                    query,
                    allowCreate: true,
                    acceptTypedIds: false,
                    onTypedUnit: () => {},
                }),
            { initialProps: { query: 'a' } },
        );
        await waitFor(() => expect(result.current.hasMore).toBe(true));
        act(() => result.current.loadMore());
        await waitFor(() => expect(result.current.results).toHaveLength(2));

        rerender({ query: 'ab' });

        // Before the new first page arrives, nothing of 'a' is offered any more.
        expect(result.current.results).toEqual([]);
        expect(result.current.hasMore).toBe(false);
        act(() => result.current.loadMore());
        await waitFor(() => expect(searchUnits).toHaveBeenLastCalledWith('ab', 1, expect.anything()));
        expect(searchUnits.mock.calls.filter(([query, page]) => query === 'ab' && page !== 1)).toEqual([]);
    });
});
