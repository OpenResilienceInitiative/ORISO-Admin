import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('../api/tenant/getSingleTenantData', () => ({
    getSingleTenantData: vi.fn(),
}));

import { useSingleTenantData } from './useSingleTenantData';
import { getSingleTenantData } from '../api/tenant/getSingleTenantData';

const getSingleTenantDataMock = vi.mocked(getSingleTenantData);

const createWrapper = () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
};

beforeEach(() => getSingleTenantDataMock.mockReset());

describe('useSingleTenantData', () => {
    it('does not fetch tenant admin data when enabled is false', async () => {
        renderHook(() => useSingleTenantData({ id: '1', enabled: false }), { wrapper: createWrapper() });

        await waitFor(() => expect(getSingleTenantDataMock).not.toHaveBeenCalled(), { timeout: 100 });
    });

    it('fetches tenant admin data by default for a valid tenant id', async () => {
        getSingleTenantDataMock.mockResolvedValue({ id: 1, name: 'Demo' } as never);

        const { result } = renderHook(() => useSingleTenantData({ id: '1' }), { wrapper: createWrapper() });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(getSingleTenantDataMock).toHaveBeenCalledWith('1');
    });

    it('does not fetch when the tenant id is add', async () => {
        renderHook(() => useSingleTenantData({ id: 'add' }), { wrapper: createWrapper() });

        await waitFor(() => expect(getSingleTenantDataMock).not.toHaveBeenCalled(), { timeout: 100 });
    });
});
