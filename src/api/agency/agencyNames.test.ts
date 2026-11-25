import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';

const mocks = vi.hoisted(() => ({ fetchData: vi.fn() }));
vi.mock('../../appConfig', () => ({
    agencyEndpointBase: 'https://api.test/service/agencyadmin/agencies',
    agencyDataAgencyId: (id: string) => `https://api.test/service/agencyadmin/agencies/${id}`,
}));
vi.mock('../fetchData', () => ({
    fetchData: mocks.fetchData,
    FETCH_METHODS: { GET: 'GET' },
    FETCH_ERRORS: { NO_MATCH: 'NO_MATCH', FORBIDDEN_SILENT: 'FORBIDDEN_SILENT', CATCH_ALL_SILENT: 'CATCH_ALL_SILENT' },
}));

import { fetchAgencyName, fetchTenantAgencyNames } from './agencyNames';

const page = (rows: Array<{ id: number; name: string }>, total: number) => ({
    total,
    _embedded: rows.map((row) => ({ _embedded: row })),
});

beforeEach(() => mocks.fetchData.mockReset());

describe('agencyNames', () => {
    it('reads every page of one Träger into an id to name map', async () => {
        mocks.fetchData
            .mockResolvedValueOnce(page([{ id: 12, name: 'Sucht &amp; Beratung' }], 2))
            .mockResolvedValueOnce(page([{ id: 14, name: 'Jugendberatung' }], 2));

        await expect(fetchTenantAgencyNames(7)).resolves.toEqual({ 12: 'Sucht & Beratung', 14: 'Jugendberatung' });
        expect(mocks.fetchData.mock.calls[0][0].url).toContain('tenantId=7');
        expect(mocks.fetchData.mock.calls[1][0].url).toContain('page=2');
    });

    it('reads a single agency name from the HAL wrapper', async () => {
        mocks.fetchData.mockResolvedValueOnce({ _embedded: { id: 12, name: 'Suchtberatung Freiburg' } });
        await expect(fetchAgencyName(12)).resolves.toBe('Suchtberatung Freiburg');
        mocks.fetchData.mockResolvedValueOnce({});
        await expect(fetchAgencyName(13)).resolves.toBeNull();
    });
});
