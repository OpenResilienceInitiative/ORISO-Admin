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
        await expect(searchInviteAgencies('x', 40)).resolves.toEqual([
            { id: 12, name: 'Agency 12', tenantId: 40, tenantName: 'Springfield', topics: ['Sucht'] },
        ]);
    });

    it('keeps agencies whose deleteDate is the literal string "null" (as AgencyService serializes it)', async () => {
        fetchData.mockResolvedValue({ total: 1, _embedded: [hit(12, { tenantId: 40, deleteDate: 'null' })] });
        await expect(searchInviteAgencies('Sucht')).resolves.toEqual([
            { id: 12, name: 'Agency 12', tenantId: 40, tenantName: undefined, topics: [] },
        ]);
    });
});
