import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const fetchData = vi.hoisted(() => vi.fn());
vi.mock('../../api/fetchData', () => ({
    fetchData,
    FETCH_METHODS: { GET: 'GET' },
    FETCH_ERRORS: { CATCH_ALL: 'CATCH_ALL' },
}));
vi.mock('../../appConfig', () => ({ agencyEndpointBase: 'https://api.test/service/agencyadmin/agencies' }));

// eslint-disable-next-line import/first
import { searchInviteAgencies } from '../../api/agency/searchInviteAgencies';
// eslint-disable-next-line import/first
import { useUnitSearch, type IdUnitSearch } from './useUnitSearch';

// The invite bar binds the chosen Träger into the search the field calls (useInviteDraft does the same).
const agencySearchIn =
    (tenantId?: number): IdUnitSearch =>
    async (query, page, signal) => {
        const result = await searchInviteAgencies(query, tenantId, page, signal);
        return { units: result.hits, hasMore: result.hasMore, total: result.total, page: result.page };
    };

const serverPage = (tenantId: number, ids: number[], total: number) => ({
    total,
    _embedded: ids.map((id) => ({ _embedded: { id, name: `Agency ${id}`, tenantId, deleteDate: 'null' } })),
});

const requestedUrls = () => fetchData.mock.calls.map(([request]) => new URL(request.url));

const renderSearch = (tenantId?: number) =>
    renderHook(
        ({ search }) =>
            useUnitSearch({
                searchUnits: search,
                open: true,
                query: '',
                allowCreate: true,
                acceptTypedIds: true,
                onTypedUnit: () => {},
            }),
        { initialProps: { search: agencySearchIn(tenantId) } },
    );

describe('useUnitSearch with the invite agency search', () => {
    beforeEach(() => {
        fetchData.mockReset();
    });

    it('asks the server for the chosen Träger only', async () => {
        fetchData.mockResolvedValue(serverPage(7, [101, 102], 2));
        const { result } = renderSearch(7);

        await waitFor(() => expect(result.current.results.map(({ id }) => id)).toEqual([101, 102]));
        expect(requestedUrls()[0].searchParams.get('tenantId')).toBe('7');
    });

    it('reads no pages ahead when the Träger is set, and counts only that Träger', async () => {
        // A full first page with more to come: the old client-side filter would have paged on.
        fetchData.mockResolvedValue(
            serverPage(
                7,
                Array.from({ length: 10 }, (_, index) => 101 + index),
                25,
            ),
        );
        const { result } = renderSearch(7);

        await waitFor(() => expect(result.current.results).toHaveLength(10));
        expect(fetchData).toHaveBeenCalledTimes(1);
        expect(result.current).toMatchObject({ hasMore: true, total: 25 });

        act(() => result.current.loadMore());
        await waitFor(() => expect(fetchData).toHaveBeenCalledTimes(2));
        expect(requestedUrls()[1].searchParams.get('page')).toBe('2');
        expect(requestedUrls()[1].searchParams.get('tenantId')).toBe('7');
    });

    it('still finds nothing foreign when the server answers only with a foreign Träger', async () => {
        // An AgencyService without the tenant filter: one request, no read-ahead, nothing foreign shown.
        fetchData.mockResolvedValue(serverPage(12, [118], 30));
        const { result } = renderSearch(7);

        await waitFor(() => expect(fetchData).toHaveBeenCalledTimes(1));
        await act(async () => {
            await new Promise((resolve) => {
                setTimeout(resolve, 300);
            });
        });
        expect(fetchData).toHaveBeenCalledTimes(1);
        expect(result.current.results).toEqual([]);
    });

    it('searches again on page 1 of the new Träger when the Träger changes', async () => {
        fetchData.mockImplementation(async ({ url }: { url: string }) => {
            const tenantId = Number(new URL(url).searchParams.get('tenantId'));
            return tenantId === 12 ? serverPage(12, [118], 1) : serverPage(7, [101], 1);
        });
        const { result, rerender } = renderSearch(7);
        await waitFor(() => expect(result.current.results.map(({ id }) => id)).toEqual([101]));

        rerender({ search: agencySearchIn(12) });

        await waitFor(() => expect(result.current.results.map(({ id }) => id)).toEqual([118]));
        const last = requestedUrls().at(-1) as URL;
        expect(last.searchParams.get('tenantId')).toBe('12');
        expect(last.searchParams.get('page')).toBe('1');
    });

    it('sends no tenantId when no Träger is chosen', async () => {
        fetchData.mockResolvedValue(serverPage(7, [101], 1));
        const { result } = renderSearch(undefined);

        await waitFor(() => expect(result.current.results).toHaveLength(1));
        expect(requestedUrls()[0].searchParams.has('tenantId')).toBe(false);
    });
});
