import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';

const fetchDataMock = vi.fn();
const coverageMock = vi.fn();

vi.mock('../../api/fetchData', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../../api/fetchData')>()),
    fetchData: (...args: unknown[]) => fetchDataMock(...args),
}));
vi.mock('../../api/contactPerson/contactPersonApi', () => ({
    postAgencyContactCoverage: (...args: unknown[]) => coverageMock(...args),
}));

const { loadContactCoverage } = await import('./useHomeFacts');

const agencies = {
    _embedded: [
        { _embedded: { id: 1, name: 'Nord', tenantId: 4, tenantName: 'Caritas Süd' } },
        { _embedded: { id: 2, name: 'Süd', tenantId: 5, tenantName: 'Diakonie' } },
    ],
    total: 2,
};

beforeEach(() => {
    fetchDataMock.mockReset();
    coverageMock.mockReset();
});

describe('loadContactCoverage (ORISO-Admin#1534)', () => {
    it('asks coverage for the centres in scope and joins their names', async () => {
        fetchDataMock.mockResolvedValue(agencies);
        coverageMock.mockResolvedValue([
            { agencyId: 1, covered: false, source: 'NONE' },
            { agencyId: 2, covered: true, source: 'OWN' },
        ]);

        const rows = await loadContactCoverage();

        // No Träger hint: the service resolves it, and a stale one is refused.
        expect(coverageMock).toHaveBeenCalledWith([1, 2]);
        expect(rows).toEqual([
            { agencyId: 1, agencyName: 'Nord', covered: false, tenantId: 4, tenantName: 'Caritas Süd' },
            { agencyId: 2, agencyName: 'Süd', covered: true, tenantId: 5, tenantName: 'Diakonie' },
        ]);
    });

    it('stays unknown when the coverage call fails', async () => {
        fetchDataMock.mockResolvedValue(agencies);
        coverageMock.mockRejectedValue(new Error('CATCH_ALL_SILENT'));

        expect(await loadContactCoverage()).toBeUndefined();
    });

    it('reads every page, so an uncovered centre after the first page still counts', async () => {
        const page = (from: number, count: number) =>
            Array.from({ length: count }, (_, index) => ({
                _embedded: { id: from + index, name: `BST ${from + index}` },
            }));
        fetchDataMock
            .mockResolvedValueOnce({ _embedded: page(1, 500), total: 501 })
            .mockResolvedValueOnce({ _embedded: page(501, 1), total: 501 });
        coverageMock.mockImplementation(async (ids: number[]) =>
            ids.map((agencyId) => ({ agencyId, covered: agencyId !== 501, source: agencyId !== 501 ? 'OWN' : 'NONE' })),
        );

        const rows = await loadContactCoverage();

        expect(fetchDataMock).toHaveBeenCalledTimes(2);
        expect(fetchDataMock.mock.calls[1][0].url).toContain('page=2&perPage=500');
        expect(coverageMock.mock.calls[0][0]).toHaveLength(501);
        expect(rows?.filter((row) => !row.covered)).toEqual([
            { agencyId: 501, agencyName: 'BST 501', covered: false, tenantId: null, tenantName: null },
        ]);
    });

    it('stays unknown when a later page fails', async () => {
        fetchDataMock
            .mockResolvedValueOnce({ _embedded: Array.from({ length: 500 }, (_, i) => ({ id: i + 1 })), total: 900 })
            .mockRejectedValueOnce(new Error('CATCH_ALL_SILENT'));

        expect(await loadContactCoverage()).toBeUndefined();
        expect(coverageMock).not.toHaveBeenCalled();
    });

    it('stays unknown when the safety stop leaves centres unread', async () => {
        const fullPage = { _embedded: Array.from({ length: 500 }, (_, i) => ({ id: i + 1 })), total: 20_001 };
        fetchDataMock.mockResolvedValue(fullPage);

        expect(await loadContactCoverage()).toBeUndefined();
        expect(fetchDataMock).toHaveBeenCalledTimes(40);
        expect(coverageMock).not.toHaveBeenCalled();
    });

    it('makes no coverage call without centres', async () => {
        fetchDataMock.mockResolvedValue({ _embedded: [], total: 0 });

        expect(await loadContactCoverage()).toEqual([]);
        expect(coverageMock).not.toHaveBeenCalled();
    });
});
