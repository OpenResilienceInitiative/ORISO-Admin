import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ fetchData: vi.fn() }));
vi.mock('../../appConfig', () => ({ addonServiceEndpoint: 'https://example.org/service/addons' }));
vi.mock('../fetchData', () => ({
    fetchData: mocks.fetchData,
    FETCH_METHODS: { GET: 'GET', PUT: 'PUT', DELETE: 'DELETE' },
    FETCH_ERRORS: {
        FORBIDDEN: 'FORBIDDEN',
        NO_MATCH: 'NO_MATCH',
        CATCH_ALL: 'CATCH_ALL',
        CATCH_ALL_SILENT: 'CATCH_ALL_SILENT',
    },
    FETCH_SUCCESS: { CONTENT: 'CONTENT' },
}));

import { getAddonAuditEntries } from './addonAuditApi';

const base = 'https://example.org/service/addons/admin/audit';
const lastCall = () => mocks.fetchData.mock.calls[mocks.fetchData.mock.calls.length - 1][0];

beforeEach(() => {
    mocks.fetchData.mockReset();
});

describe('getAddonAuditEntries', () => {
    it('sends every filter that is set and skips the empty ones', async () => {
        mocks.fetchData.mockResolvedValue({ items: [], page: 0, size: 50, total: 0 });

        await getAddonAuditEntries({
            tenantId: 7,
            addon: 'digi tools',
            from: '2026-11-01T00:00:00.000Z',
            to: '2026-11-02T00:00:00.000Z',
            page: 2,
            size: 50,
        });
        expect(lastCall()).toMatchObject({
            url: `${base}?tenantId=7&addon=digi+tools&from=2026-11-01T00%3A00%3A00.000Z&to=2026-11-02T00%3A00%3A00.000Z&page=2&size=50`,
            method: 'GET',
        });
        expect(lastCall().responseHandling).toEqual(['FORBIDDEN', 'NO_MATCH', 'CATCH_ALL_SILENT']);

        await getAddonAuditEntries({ tenantId: null, addon: '', page: 0, size: 20 });
        expect(lastCall().url).toBe(`${base}?page=0&size=20`);
    });

    it('returns the page and reads zoneless timestamps as UTC', async () => {
        mocks.fetchData.mockResolvedValue({
            items: [{ id: 'a1', createdAt: '2026-11-12T08:30:00', addon: 'demo', action: 'tool.released' }],
            page: 1,
            size: 20,
            total: 21,
        });

        await expect(getAddonAuditEntries({ page: 1, size: 20 })).resolves.toEqual({
            items: [{ id: 'a1', createdAt: '2026-11-12T08:30:00Z', addon: 'demo', action: 'tool.released' }],
            page: 1,
            size: 20,
            total: 21,
        });
    });

    it('degrades a body without items to an empty page', async () => {
        mocks.fetchData.mockResolvedValue(null);

        await expect(getAddonAuditEntries({ page: 3, size: 50 })).resolves.toEqual({
            items: [],
            page: 3,
            size: 50,
            total: 0,
        });
    });

    it('passes a failed request on to the caller', async () => {
        mocks.fetchData.mockRejectedValue(new Error('FORBIDDEN'));

        await expect(getAddonAuditEntries({ page: 0, size: 50 })).rejects.toThrow('FORBIDDEN');
    });
});
