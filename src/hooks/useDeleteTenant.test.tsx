import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('../api/tenant/deleteTenantData', () => ({ deleteTenantData: vi.fn() }));

import { useDeleteTenant } from './useDeleteTenant';
import { deleteTenantData } from '../api/tenant/deleteTenantData';
import { TENANTS_QUERY_KEY } from './useTenantsData';

const deleteMock = vi.mocked(deleteTenantData);

beforeEach(() => deleteMock.mockReset());

const renderWithClient = () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidateQueries = vi.spyOn(client, 'invalidateQueries');
    const removeQueries = vi.spyOn(client, 'removeQueries');
    const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    return { wrapper, invalidateQueries, removeQueries };
};

describe('useDeleteTenant', () => {
    it('deletes the tenant and invalidates/removes its cache entries on success', async () => {
        deleteMock.mockResolvedValue(undefined);
        const onSuccess = vi.fn();
        const { wrapper, invalidateQueries, removeQueries } = renderWithClient();

        const { result } = renderHook(() => useDeleteTenant({ onSuccess }), { wrapper });
        result.current.mutate(42);

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(deleteMock).toHaveBeenCalledWith(42);
        expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: [TENANTS_QUERY_KEY] });
        expect(removeQueries).toHaveBeenCalledWith({ queryKey: ['TENANT', 42] });
        expect(onSuccess).toHaveBeenCalled();
    });
});
