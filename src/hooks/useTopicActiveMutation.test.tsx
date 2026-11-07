import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';

const fetchData = vi.hoisted(() => vi.fn());

vi.mock('../api/fetchData', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../api/fetchData')>()),
    fetchData,
}));

// eslint-disable-next-line import/first
import { FETCH_ERRORS, FETCH_METHODS } from '../api/fetchData';
// eslint-disable-next-line import/first
import { useTopicActiveMutation } from './useTopicActiveMutation';

const stored = { id: 4, name: { de: 'Sucht' }, description: { de: 'alt' }, status: 'ACTIVE' };

const setup = () => {
    const client = new QueryClient();
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    return { ...renderHook(() => useTopicActiveMutation(), { wrapper }), invalidate };
};

describe('useTopicActiveMutation', () => {
    beforeEach(() => {
        fetchData.mockReset();
        fetchData.mockResolvedValueOnce(stored).mockResolvedValueOnce({});
    });

    it('reads the stored topic and puts it back with only the status changed', async () => {
        const { result } = setup();
        result.current.mutate({ id: 4, active: false });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(fetchData.mock.calls[0][0].method).toBe(FETCH_METHODS.GET);
        expect(fetchData.mock.calls[1][0].method).toBe(FETCH_METHODS.PUT);
        const body = JSON.parse(fetchData.mock.calls[1][0].bodyData);
        expect(body.status).toBe('INACTIVE');
        expect(body.name).toEqual({ de: 'Sucht' });
    });

    it('refreshes both topic lists before the mutation counts as finished', async () => {
        const { result, invalidate } = setup();
        result.current.mutate({ id: 4, active: true });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(invalidate).toHaveBeenCalledTimes(2);
    });

    it('stays silent and keeps the page on a 403, so the page can show one message of its own', async () => {
        const { result } = setup();
        result.current.mutate({ id: 4, active: true });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        fetchData.mock.calls.forEach(([call]) => {
            expect(call.responseHandling).toContain(FETCH_ERRORS.CATCH_ALL_SILENT);
            expect(call.responseHandling).toContain(FETCH_ERRORS.FORBIDDEN_SILENT);
            expect(call.responseHandling).not.toContain(FETCH_ERRORS.CATCH_ALL);
        });
    });

    it('reports a failed save as an error', async () => {
        fetchData.mockReset();
        fetchData.mockResolvedValueOnce(stored).mockRejectedValueOnce(new Error(FETCH_ERRORS.NOT_ALLOWED));
        const { result } = setup();
        result.current.mutate({ id: 4, active: true });
        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});
