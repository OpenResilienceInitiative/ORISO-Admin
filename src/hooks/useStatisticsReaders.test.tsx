import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { FETCH_ERRORS, FETCH_METHODS } from '../api/fetchData';
import { statisticsReadersEndpoint, statisticsReadersSearchEndpoint } from '../appConfig';

const fetchData = vi.hoisted(() => vi.fn());

vi.mock('../api/fetchData', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../api/fetchData')>()),
    fetchData,
}));

// eslint-disable-next-line import/first
import {
    STATISTICS_READER_QUERY_KEY,
    STATISTICS_READERS_QUERY_KEY,
    useAddOrUpdateStatisticsReader,
    useDeleteStatisticsReader,
    useStatisticsReaderData,
    useStatisticsReadersData,
} from './useStatisticsReaders';

const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        {children}
    </QueryClientProvider>
);

const newClient = () => new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
const wrapperFor =
    (client: QueryClient) =>
    ({ children }: { children: ReactNode }) =>
        <QueryClientProvider client={client}>{children}</QueryClientProvider>;

const LIST_KEY = [STATISTICS_READERS_QUERY_KEY, '*', 1, 'LASTNAME', 'ASC', 10];
const DETAIL_KEY = [STATISTICS_READER_QUERY_KEY, '44'];
/** A client holding one reader list page and the reader's detail, both fresh. */
const seededClient = () => {
    const client = newClient();
    client.setQueryData(LIST_KEY, { total: 1, data: [{ id: '44' }] });
    client.setQueryData(DETAIL_KEY, { id: '44', firstname: 'Old' });
    return client;
};

const reader = { id: '44', firstname: 'Sam', lastname: 'Reader', email: 'sam@example.test', username: 'sam' };

describe('Statistik-Leser API (ORISO-UserService#1666)', () => {
    beforeEach(() => {
        fetchData.mockReset();
    });

    it('lives on the user service under /useradmin/statisticsreaders', () => {
        expect(statisticsReadersEndpoint).toMatch(/\/service\/useradmin\/statisticsreaders$/);
        expect(statisticsReadersSearchEndpoint).toBe(`${statisticsReadersEndpoint}/search`);
    });

    it('searches one server page with query, page, perPage, field and order', async () => {
        fetchData.mockResolvedValue({ total: 31, _embedded: [{ _embedded: reader }] });

        const { result } = renderHook(
            () =>
                useStatisticsReadersData({
                    search: 'sam',
                    current: 3,
                    pageSize: 10,
                    sortBy: 'LASTNAME',
                    order: 'DESC',
                }),
            { wrapper },
        );

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        const { url, method } = fetchData.mock.calls[0][0];
        expect(method).toBe(FETCH_METHODS.GET);
        expect(url).toBe(`${statisticsReadersSearchEndpoint}?query=sam&page=3&perPage=10&order=DESC&field=LASTNAME`);
        expect(result.current.data?.total).toBe(31);
        expect(result.current.data?.data[0]).toMatchObject({ id: '44', email: 'sam@example.test' });
    });

    it('searches everyone with "*" when no search term is given', async () => {
        fetchData.mockResolvedValue({ total: 0, _embedded: [] });

        renderHook(() => useStatisticsReadersData({ current: 1, pageSize: 10 }), { wrapper });

        await waitFor(() => expect(fetchData).toHaveBeenCalled());
        expect(fetchData.mock.calls[0][0].url).toContain('?query=*&page=1&perPage=10');
    });

    it('reads one reader', async () => {
        fetchData.mockResolvedValue({ _embedded: reader });

        const { result } = renderHook(() => useStatisticsReaderData({ id: '44' }), { wrapper });

        await waitFor(() => expect(result.current.data).toEqual(reader));
        expect(fetchData.mock.calls[0][0]).toMatchObject({
            url: `${statisticsReadersEndpoint}/44`,
            method: FETCH_METHODS.GET,
        });
    });

    it('rejects a refused or unknown reader in place instead of redirecting', async () => {
        fetchData.mockRejectedValue(new Error(FETCH_ERRORS.FORBIDDEN));

        const { result } = renderHook(() => useStatisticsReaderData({ id: '44', retry: false }), { wrapper });

        await waitFor(() => expect(result.current.isError).toBe(true));
        expect(result.current.error?.message).toBe(FETCH_ERRORS.FORBIDDEN);
        expect(fetchData.mock.calls[0][0].responseHandling).toEqual([FETCH_ERRORS.FORBIDDEN, FETCH_ERRORS.NO_MATCH]);
    });

    it('creates a reader with name, username and e-mail only', async () => {
        fetchData.mockResolvedValue({ _embedded: reader });

        const { result } = renderHook(() => useAddOrUpdateStatisticsReader({}), { wrapper });
        result.current.mutate({ ...reader, id: undefined, tenantId: '5', password: 'x' } as never);

        await waitFor(() => expect(fetchData).toHaveBeenCalled());
        const call = fetchData.mock.calls[0][0];
        expect(call.url).toBe(statisticsReadersEndpoint);
        expect(call.method).toBe(FETCH_METHODS.POST);
        expect(JSON.parse(call.bodyData)).toEqual({
            firstname: 'Sam',
            lastname: 'Reader',
            username: 'sam',
            email: 'sam@example.test',
        });
    });

    it('updates a reader without the username', async () => {
        fetchData.mockResolvedValue({ _embedded: reader });

        const { result } = renderHook(() => useAddOrUpdateStatisticsReader({ id: '44' }), { wrapper });
        result.current.mutate(reader as never);

        await waitFor(() => expect(fetchData).toHaveBeenCalled());
        const call = fetchData.mock.calls[0][0];
        expect(call.url).toBe(`${statisticsReadersEndpoint}/44`);
        expect(call.method).toBe(FETCH_METHODS.PUT);
        expect(JSON.parse(call.bodyData)).toEqual({
            firstname: 'Sam',
            lastname: 'Reader',
            email: 'sam@example.test',
        });
    });

    it('deletes a reader', async () => {
        fetchData.mockResolvedValue(undefined);

        const { result } = renderHook(() => useDeleteStatisticsReader({}), { wrapper });
        result.current.mutate('44');

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(fetchData.mock.calls[0][0]).toMatchObject({
            url: `${statisticsReadersEndpoint}/44`,
            method: FETCH_METHODS.DELETE,
        });
    });

    describe('cache after a mutation', () => {
        it('drops the deleted reader and refreshes the lists after a delete', async () => {
            fetchData.mockResolvedValue(undefined);
            const client = seededClient();

            const { result } = renderHook(() => useDeleteStatisticsReader({}), { wrapper: wrapperFor(client) });
            result.current.mutate('44');

            await waitFor(() => expect(result.current.isSuccess).toBe(true));
            expect(client.getQueryCache().find({ queryKey: DETAIL_KEY })).toBeUndefined();
            expect(client.getQueryState(LIST_KEY)?.isInvalidated).toBe(true);
        });

        it('keeps the reader and the lists untouched when the delete fails', async () => {
            fetchData.mockRejectedValue(new TypeError('Failed to fetch'));
            const client = seededClient();
            const onError = vi.fn();

            const { result } = renderHook(() => useDeleteStatisticsReader({ onError }), {
                wrapper: wrapperFor(client),
            });
            result.current.mutate('44');

            await waitFor(() => expect(result.current.isError).toBe(true));
            expect(onError).toHaveBeenCalled();
            expect(client.getQueryData(DETAIL_KEY)).toEqual({ id: '44', firstname: 'Old' });
            expect(client.getQueryState(LIST_KEY)?.isInvalidated).toBe(false);
        });

        it('stores the saved reader and refreshes the lists after a save', async () => {
            fetchData.mockResolvedValue({ _embedded: reader });
            const client = seededClient();

            const { result } = renderHook(() => useAddOrUpdateStatisticsReader({ id: '44' }), {
                wrapper: wrapperFor(client),
            });
            result.current.mutate(reader as never);

            await waitFor(() => expect(result.current.isSuccess).toBe(true));
            expect(client.getQueryData(DETAIL_KEY)).toEqual(reader);
            expect(client.getQueryState(LIST_KEY)?.isInvalidated).toBe(true);
        });

        it('keeps the cached reader and lists when a save fails', async () => {
            fetchData.mockRejectedValue(new Error(FETCH_ERRORS.CATCH_ALL));
            const client = seededClient();

            const { result } = renderHook(() => useAddOrUpdateStatisticsReader({ id: '44' }), {
                wrapper: wrapperFor(client),
            });
            result.current.mutate(reader as never);

            await waitFor(() => expect(result.current.isError).toBe(true));
            expect(client.getQueryData(DETAIL_KEY)).toEqual({ id: '44', firstname: 'Old' });
            expect(client.getQueryState(LIST_KEY)?.isInvalidated).toBe(false);
        });
    });
});
