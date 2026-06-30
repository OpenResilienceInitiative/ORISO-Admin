import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('../api/fetchData', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../api/fetchData')>();
    return { ...actual, fetchData: vi.fn() };
});

import { useTenantsData } from './useTenantsData';
import { fetchData } from '../api/fetchData';
import { tenantAdminEndpoint } from '../appConfig';

const fetchMock = vi.mocked(fetchData);

const createWrapper = () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
};

beforeEach(() => fetchMock.mockReset());

describe('useTenantsData', () => {
    it('fetches the tenant search endpoint and exposes the unwrapped list', async () => {
        fetchMock.mockResolvedValue({ total: 2, _embedded: [{ id: 1 }, { id: 2 }] });

        const { result } = renderHook(() => useTenantsData({ page: 1 }), { wrapper: createWrapper() });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data).toEqual({ total: 2, data: [{ id: 1 }, { id: 2 }] });
        expect(fetchMock).toHaveBeenCalledWith(
            expect.objectContaining({
                url: expect.stringContaining(`${tenantAdminEndpoint}/search?page=1`),
            }),
        );
    });

    it('builds the query key from the paging/search params', async () => {
        fetchMock.mockResolvedValue({ total: 0, _embedded: [] });

        const { result } = renderHook(() => useTenantsData({ page: 3, search: 'abc', perPage: 25 }), {
            wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(fetchMock).toHaveBeenCalledWith(
            expect.objectContaining({
                url: expect.stringContaining('page=3&perPage=25&query=abc'),
            }),
        );
    });
});
