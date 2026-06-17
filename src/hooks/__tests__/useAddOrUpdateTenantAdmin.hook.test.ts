import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { renderHook } from '@testing-library/react-hooks';
import { useAddOrUpdateTenantAdmin } from '../useAddOrUpdateTenantAdmin.hook';
import { fetchData } from '../../api/fetchData';

vi.mock('../../api/fetchData', () => ({
    fetchData: vi.fn(),
    FETCH_METHODS: { POST: 'POST', PUT: 'PUT' },
    FETCH_ERRORS: {
        BAD_REQUEST_WITH_RESPONSE: 'BAD_REQUEST_WITH_RESPONSE',
        CONFLICT_WITH_RESPONSE: 'CONFLICT_WITH_RESPONSE',
        CATCH_ALL: 'CATCH_ALL',
    },
    FETCH_SUCCESS: {
        CONTENT: 'CONTENT',
    },
}));

vi.mock('../useTenantUserAdminData', () => ({
    useTenantUserAdminData: () => ({ data: null }),
    TENANT_ADMIN_QUERY_KEY: 'tenant-admin',
    TENANT_ADMINS_QUERY_KEY: 'tenant-admins',
}));

vi.mock('../useSingleTenantData', () => ({
    TENANT_QUERY_KEY: 'tenant',
}));

const mockFetchData = vi.mocked(fetchData);

const plaintextUsername = 'tenant-admin@example.com';

const createWrapper = () => {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
        },
    });

    return ({ children }: { children: React.ReactNode }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('useAddOrUpdateTenantAdmin', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockFetchData.mockResolvedValue(
            new Response(JSON.stringify({ _embedded: { id: 'tenant-admin-1' } }), {
                status: 200,
                headers: { 'content-type': 'application/json' },
            }),
        );
    });

    it('sends a plaintext username when creating a tenant admin', async () => {
        const { result } = renderHook(() => useAddOrUpdateTenantAdmin({}), { wrapper: createWrapper() });

        await result.current.mutateAsync({
            firstname: 'Test',
            lastname: 'TenantAdmin',
            email: plaintextUsername,
            username: plaintextUsername,
            twoFactorAuth: false,
        } as any);

        const { bodyData } = mockFetchData.mock.calls[0][0];
        const payload = JSON.parse(bodyData);

        expect(payload.username).toBe(plaintextUsername);
        expect(payload.username).not.toMatch(/^enc\./);
    });

    it('falls back to plaintext email when username is omitted', async () => {
        const { result } = renderHook(() => useAddOrUpdateTenantAdmin({}), { wrapper: createWrapper() });

        await result.current.mutateAsync({
            firstname: 'Test',
            lastname: 'TenantAdmin',
            email: plaintextUsername,
            twoFactorAuth: false,
        } as any);

        const { bodyData } = mockFetchData.mock.calls[0][0];
        const payload = JSON.parse(bodyData);

        expect(payload.username).toBe(plaintextUsername);
        expect(payload.username).not.toMatch(/^enc\./);
    });
});
