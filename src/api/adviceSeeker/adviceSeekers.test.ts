import { describe, it, expect, vi, beforeEach, Mock } from 'vite-plus/test';
import { deleteAdviceSeekers, getAdviceSeekers } from './adviceSeekers';
import { fetchData, FETCH_ERRORS, FETCH_METHODS } from '../fetchData';

vi.mock('../fetchData', async () => {
    const actual = await vi.importActual<typeof import('../fetchData')>('../fetchData');
    return { ...actual, fetchData: vi.fn() };
});

describe('adviceSeekers api', () => {
    const mockedFetchData = fetchData as unknown as Mock;

    beforeEach(() => {
        mockedFetchData.mockReset();
    });

    it('lists advice seekers with paging, exact username and scope filters', async () => {
        mockedFetchData.mockResolvedValue({
            _embedded: [{ id: 'a-1', username: 'anna', agencyIds: [3], deletionState: 'ACTIVE' }],
            total: 41,
        });

        const result = await getAdviceSeekers({
            page: 2,
            perPage: 20,
            username: ' anna ',
            filters: { tenantId: '7', agencyIds: ['3', '4'] },
        });

        const call = mockedFetchData.mock.calls[0][0];
        expect(call.method).toBe(FETCH_METHODS.GET);
        const url = new URL(call.url, 'http://admin.test');
        expect(url.pathname).toMatch(/\/service\/useradmin\/askers$/);
        expect(url.searchParams.get('page')).toBe('2');
        expect(url.searchParams.get('perPage')).toBe('20');
        expect(url.searchParams.get('username')).toBe('anna');
        expect(url.searchParams.get('tenantId')).toBe('7');
        expect(url.searchParams.get('agencyId')).toBe('3,4');
        expect(result).toEqual({
            total: 41,
            data: [{ id: 'a-1', username: 'anna', agencyIds: [3], deletionState: 'ACTIVE' }],
        });
    });

    it('omits empty filters', async () => {
        mockedFetchData.mockResolvedValue({ _embedded: [], total: 0 });

        await getAdviceSeekers({ page: 1, perPage: 20, username: '  ', filters: {} });

        const url = new URL(mockedFetchData.mock.calls[0][0].url, 'http://admin.test');
        expect([...url.searchParams.keys()]).toEqual(['page', 'perPage']);
    });

    it('marks each advice seeker in turn and reports every outcome', async () => {
        mockedFetchData
            .mockResolvedValueOnce({ status: 200 })
            .mockRejectedValueOnce(new Response(null, { status: 409 }))
            .mockRejectedValueOnce(new Error(FETCH_ERRORS.NO_MATCH))
            .mockRejectedValueOnce(new Response(null, { status: 500, headers: { 'X-Reason': 'KEYCLOAK_DOWN' } }));

        const outcomes = await deleteAdviceSeekers(['a-1', 'a-2', 'a-3', 'a-4']);

        expect(mockedFetchData.mock.calls.map(([call]) => [call.method, call.url.split('/askers/')[1]])).toEqual([
            [FETCH_METHODS.DELETE, 'a-1'],
            [FETCH_METHODS.DELETE, 'a-2'],
            [FETCH_METHODS.DELETE, 'a-3'],
            [FETCH_METHODS.DELETE, 'a-4'],
        ]);
        expect(outcomes).toEqual([
            { id: 'a-1', result: 'marked' },
            { id: 'a-2', result: 'alreadyMarked' },
            { id: 'a-3', result: 'notFound' },
            { id: 'a-4', result: 'failed', reason: 'KEYCLOAK_DOWN', status: 500 },
        ]);
    });

    it('reports a refused deletion as forbidden without redirecting', async () => {
        mockedFetchData.mockRejectedValueOnce(new Error(FETCH_ERRORS.NOT_ALLOWED));

        const [outcome] = await deleteAdviceSeekers(['a-9']);

        expect(outcome).toEqual({ id: 'a-9', result: 'forbidden' });
        expect(mockedFetchData.mock.calls[0][0].responseHandling).toContain(FETCH_ERRORS.FORBIDDEN_SILENT);
    });

    it('reports a technical account of an existing Träger as such', async () => {
        mockedFetchData.mockRejectedValueOnce(
            new Response(null, { status: 409, headers: { 'X-Reason': 'TECHNICAL_ACCOUNT_OF_EXISTING_TENANT' } }),
        );

        const [outcome] = await deleteAdviceSeekers(['group-chat-system-3']);

        expect(outcome).toEqual({ id: 'group-chat-system-3', result: 'technicalAccount' });
        expect(mockedFetchData.mock.calls[0][0].responseHandling).toContain(FETCH_ERRORS.CONFLICT_WITH_RESPONSE);
    });
});
