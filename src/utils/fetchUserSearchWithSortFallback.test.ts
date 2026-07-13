import { describe, it, expect, vi, beforeEach } from 'vitest';

const fetchDataMock = vi.fn();
vi.mock('../api/fetchData', () => ({
    fetchData: (...args: unknown[]) => fetchDataMock(...args),
    FETCH_METHODS: { GET: 'GET' },
}));
// removeEmbedded just unwraps the HAL envelope; pass the list through.
vi.mock('./removeEmbedded', () => ({ default: (r: unknown) => r }));

// eslint-disable-next-line import/first
import { fetchUserSearchWithSortFallback } from './fetchUserSearchWithSortFallback';

const list = (names: string[]) => ({ data: names.map((name) => ({ username: name })), total: names.length });

beforeEach(() => fetchDataMock.mockReset());

// #77: sorting must never hang — a rejected sort field falls back, never loops.
describe('fetchUserSearchWithSortFallback', () => {
    it('requests with the mapped sort field + order and returns the list on success', async () => {
        fetchDataMock.mockResolvedValueOnce(list(['Ada']));

        const result = await fetchUserSearchWithSortFallback({
            url: 'https://api/users?query=*&page=1&perPage=10',
            sortBy: 'UPDATE_DATE',
            order: 'DESC',
        });

        expect(fetchDataMock).toHaveBeenCalledTimes(1);
        expect(fetchDataMock.mock.calls[0][0].url).toBe(
            'https://api/users?query=*&page=1&perPage=10&order=DESC&field=UPDATE_DATE',
        );
        expect(result).toEqual(list(['Ada']));
    });

    it('falls back to the API-safe FIRSTNAME/ASC sort when the requested field is rejected', async () => {
        fetchDataMock
            .mockRejectedValueOnce(new Error('BAD_REQUEST')) // UPDATE_DATE unsupported on this backend
            .mockResolvedValueOnce(list(['Bob'])); // FIRSTNAME/ASC works

        const result = await fetchUserSearchWithSortFallback({
            url: 'https://api/users?query=*&page=1&perPage=10',
            sortBy: 'UPDATE_DATE',
            order: 'DESC',
        });

        expect(fetchDataMock).toHaveBeenCalledTimes(2);
        expect(fetchDataMock.mock.calls[1][0].url).toContain('&order=ASC&field=FIRSTNAME');
        expect(result).toEqual(list(['Bob']));
    });

    it('returns an empty list (never hangs / throws) when even the safe fallback fails', async () => {
        fetchDataMock
            .mockRejectedValueOnce(new Error('CATCH_ALL')) // UPDATE_DATE/DESC
            .mockRejectedValueOnce(new Error('CATCH_ALL')); // FIRSTNAME/ASC fallback

        const result = await fetchUserSearchWithSortFallback({
            url: 'https://api/users?query=*&page=1&perPage=10',
            sortBy: 'UPDATE_DATE',
            order: 'DESC',
        });

        expect(fetchDataMock).toHaveBeenCalledTimes(2);
        expect(result).toEqual({ data: [], total: 0 });
    });

    it('does not retry when the primary request already used the safe sort and failed', async () => {
        fetchDataMock.mockRejectedValueOnce(new Error('CATCH_ALL'));

        const result = await fetchUserSearchWithSortFallback({
            url: 'https://api/users?query=*&page=1&perPage=10',
            sortBy: 'FIRSTNAME',
            order: 'ASC',
        });

        expect(fetchDataMock).toHaveBeenCalledTimes(1); // no pointless second identical request
        expect(result).toEqual({ data: [], total: 0 });
    });

    it('rethrows instead of swallowing when rethrowOnFailure is set', async () => {
        fetchDataMock.mockRejectedValueOnce(new Error('CATCH_ALL'));

        await expect(
            fetchUserSearchWithSortFallback({
                url: 'https://api/users?query=*&page=1&perPage=10',
                sortBy: 'FIRSTNAME',
                order: 'ASC',
                rethrowOnFailure: true,
            }),
        ).rejects.toThrow('CATCH_ALL');
    });

    it('applies a provided normalizeSortField before requesting (tenant-admin allowed-field guard)', async () => {
        fetchDataMock.mockResolvedValueOnce(list(['Cara']));

        await fetchUserSearchWithSortFallback({
            url: 'https://api/admins?query=*&page=1&perPage=10',
            sortBy: 'SOME_UNSUPPORTED_FIELD',
            order: 'DESC',
            normalizeSortField: () => 'LASTNAME',
        });

        expect(fetchDataMock.mock.calls[0][0].url).toContain('&field=LASTNAME');
    });
});
