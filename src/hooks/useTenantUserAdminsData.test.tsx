import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('../utils/fetchUserSearchWithSortFallback', () => ({
    fetchUserSearchWithSortFallback: vi.fn(),
}));

import { fetchUserSearchWithSortFallback } from '../utils/fetchUserSearchWithSortFallback';
import { useTenantAdminsData } from './useTenantUserAdminsData';

const fetchMock = vi.mocked(fetchUserSearchWithSortFallback);

const createWrapper = () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
};

describe('useTenantAdminsData', () => {
    beforeEach(() => {
        fetchMock.mockReset();
    });

    it('excludes platform administrators and paginates the tenant-scoped result', async () => {
        fetchMock.mockResolvedValue({
            total: 3,
            data: [
                { id: 'platform', tenantId: '0' },
                { id: 'tenant-one', tenantId: '1' },
                { id: 'tenant-two', tenantId: '2' },
            ],
        } as never);

        const { result } = renderHook(() => useTenantAdminsData({ current: 2, pageSize: 1 }), {
            wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(fetchMock).toHaveBeenCalledWith(
            expect.objectContaining({
                url: expect.stringContaining('page=1&perPage=1000'),
            }),
        );
        expect(result.current.data).toEqual({
            total: 2,
            data: [expect.objectContaining({ id: 'tenant-two', tenantId: '2' })],
        });
    });
});
