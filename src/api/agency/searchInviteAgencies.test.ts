import { beforeEach, describe, expect, it, vi } from 'vitest';

const fetchData = vi.hoisted(() => vi.fn());
vi.mock('../fetchData', () => ({
    fetchData,
    FETCH_METHODS: { GET: 'GET' },
    FETCH_ERRORS: { CATCH_ALL: 'CATCH_ALL' },
}));
vi.mock('../../appConfig', () => ({ agencyEndpointBase: 'https://api.test/service/agencyadmin/agencies' }));

// eslint-disable-next-line import/first
import { searchInviteAgencies } from './searchInviteAgencies';

const hit = (id: number, extra: Record<string, unknown> = {}) => ({
    _embedded: { id, name: `Agency ${id}`, ...extra },
});

describe('searchInviteAgencies', () => {
    beforeEach(() => fetchData.mockReset());

    it('calls the agency list with the picker query', async () => {
        fetchData.mockResolvedValue({ _embedded: [], total: 0 });
        await searchInviteAgencies(' Sucht ');
        expect(fetchData).toHaveBeenCalledWith(
            expect.objectContaining({
                url: 'https://api.test/service/agencyadmin/agencies?q=Sucht&page=1&perPage=10&field=NAME&order=ASC&excludeDeleted=true',
                method: 'GET',
            }),
        );
    });

    it('asks for everything on an empty query', async () => {
        fetchData.mockResolvedValue({ _embedded: [], total: 0 });
        await searchInviteAgencies('');
        expect(fetchData.mock.calls[0][0].url).toContain('?q=*&');
    });

    it('maps hits with topic names, drops deleted ones and scopes to the chosen Träger', async () => {
        fetchData.mockResolvedValue({
            total: 3,
            _embedded: [
                hit(12, { tenantId: 40, tenantName: 'Springfield', topics: [{ id: 2, name: 'Sucht' }, { id: 3 }] }),
                hit(13, { tenantId: 40, deleteDate: '2026-09-01T00:00:00Z' }),
                hit(14, { tenantId: 1 }),
            ],
        });
        await expect(searchInviteAgencies('x', 40)).resolves.toMatchObject({
            hits: [{ id: 12, name: 'Agency 12', tenantId: 40, tenantName: 'Springfield', topics: ['Sucht'] }],
        });
    });

    it('keeps agencies whose deleteDate is the string "null"', async () => {
        fetchData.mockResolvedValue({ total: 1, _embedded: [hit(12, { tenantId: 40, deleteDate: 'null' })] });
        await expect(searchInviteAgencies('Sucht')).resolves.toMatchObject({
            hits: [{ id: 12, name: 'Agency 12', tenantId: 40, tenantName: undefined, topics: [] }],
        });
    });

    // The server pages with a full `total`, so the client must offer the next page.
    it('reports whether more hits exist beyond this page, counted on the server side', async () => {
        fetchData.mockResolvedValue({
            total: 12,
            _embedded: Array.from({ length: 10 }, (_, index) => hit(100 + index, { tenantId: 40 })),
        });
        const page = await searchInviteAgencies('');
        expect(page.hits).toHaveLength(10);
        expect(page).toMatchObject({ total: 12, hasMore: true });
    });

    it('fetches a later page on request and knows when it is the last one', async () => {
        fetchData.mockResolvedValue({ total: 12, _embedded: [hit(110, { tenantId: 40 }), hit(111, { tenantId: 40 })] });
        const page = await searchInviteAgencies('', undefined, 2);
        expect(fetchData.mock.calls[0][0].url).toContain('&page=2&perPage=10&');
        expect(page.hits.map(({ id }) => id)).toEqual([110, 111]);
        expect(page.hasMore).toBe(false);
    });

    it('asks the server for the chosen Träger and reads no pages ahead', async () => {
        fetchData.mockResolvedValue({
            total: 30,
            _embedded: Array.from({ length: 10 }, (_, index) => hit(index + 1, { tenantId: 40 })),
        });

        const result = await searchInviteAgencies('Sucht', 40, 2);

        expect(fetchData).toHaveBeenCalledTimes(1);
        expect(fetchData.mock.calls[0][0].url).toBe(
            'https://api.test/service/agencyadmin/agencies?q=Sucht&page=2&perPage=10&field=NAME&order=ASC&excludeDeleted=true&tenantId=40',
        );
        // The server counted only this Träger, so its total is the picker's total.
        expect(result).toMatchObject({ total: 30, hasMore: true, page: 2 });
        expect(result.hits).toHaveLength(10);
    });

    it('hands back an empty page instead of paging on when the chosen Träger has no hits there', async () => {
        // An AgencyService without the tenant filter still answers with other Träger: shown as nothing.
        fetchData.mockResolvedValue({ total: 1000, _embedded: [hit(1, { tenantId: 1 })] });
        const result = await searchInviteAgencies('', 40, 1);
        expect(fetchData).toHaveBeenCalledTimes(1);
        expect(result).toMatchObject({ hits: [], hasMore: true, page: 1 });
    });

    it('sends no tenantId without a chosen Träger', async () => {
        fetchData.mockResolvedValue({ total: 0, _embedded: [] });
        await searchInviteAgencies('Sucht');
        expect(fetchData.mock.calls[0][0].url).not.toContain('tenantId');
    });

    it('reads ahead past pages that only hold deleted agencies, at most 20', async () => {
        fetchData.mockResolvedValue({
            total: 1000,
            _embedded: [hit(1, { tenantId: 40, deleteDate: '2026-09-01T00:00:00Z' })],
        });
        const result = await searchInviteAgencies('', undefined, 3);
        expect(fetchData).toHaveBeenCalledTimes(20);
        expect(fetchData.mock.calls[19][0].url).toContain('&page=22&');
        expect(result).toMatchObject({ hits: [], hasMore: true, page: 22 });
    });

    it('stops reading ahead once its signal is aborted', async () => {
        const controller = new AbortController();
        fetchData.mockImplementation(async () => {
            controller.abort();
            return { total: 1000, _embedded: [hit(1, { deleteDate: '2026-09-01T00:00:00Z' })] };
        });
        await expect(searchInviteAgencies('', undefined, 1, controller.signal)).rejects.toThrow();
        expect(fetchData).toHaveBeenCalledTimes(1);
        expect(fetchData.mock.calls[0][0].signal).toBe(controller.signal);
    });

    it('stops reading ahead when the server has nothing more', async () => {
        fetchData.mockResolvedValue({ total: 10, _embedded: [hit(1, { deleteDate: '2026-09-01T00:00:00Z' })] });
        const result = await searchInviteAgencies('', undefined, 1);
        expect(result).toMatchObject({ hits: [], hasMore: false, page: 1 });
        expect(fetchData).toHaveBeenCalledTimes(1);
    });
});
