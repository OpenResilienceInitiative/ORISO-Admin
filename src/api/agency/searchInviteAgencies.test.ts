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

describe('searchInviteAgencies (#1026 slice 2)', () => {
    beforeEach(() => fetchData.mockReset());

    it('calls the picker contract of AgencyService#307', async () => {
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

    it('keeps agencies whose deleteDate is the literal string "null" (as AgencyService serializes it)', async () => {
        fetchData.mockResolvedValue({ total: 1, _embedded: [hit(12, { tenantId: 40, deleteDate: 'null' })] });
        await expect(searchInviteAgencies('Sucht')).resolves.toMatchObject({
            hits: [{ id: 12, name: 'Agency 12', tenantId: 40, tenantName: undefined, topics: [] }],
        });
    });

    /*
     * Pre-Dev finding (#1026): an agency admin with more than 10 agencies only
     * ever saw the first 10 — the picker asked for page 1 and nothing else. The
     * backend pages (`total` = full hit count, no perPage cap), so the client
     * must say whether there is more and fetch the next page on request.
     */
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

    it('keeps paging when a Träger filter drops every hit of a page (hasMore follows the server)', async () => {
        fetchData.mockResolvedValue({
            total: 25,
            _embedded: Array.from({ length: 10 }, (_, index) => hit(200 + index, { tenantId: 1 })),
        });
        const page = await searchInviteAgencies('', 40);
        expect(page.hits).toEqual([]);
        expect(page.hasMore).toBe(true);
    });
});
