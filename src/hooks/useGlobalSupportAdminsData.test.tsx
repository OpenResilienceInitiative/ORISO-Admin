import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../api/fetchData', () => ({
    fetchData: vi.fn(),
    FETCH_METHODS: { GET: 'GET' },
}));

import { fetchData } from '../api/fetchData';
import { useGlobalSupportAdminsData } from './useGlobalSupportAdminsData';

const createWrapper = () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
};

describe('useGlobalSupportAdminsData', () => {
    beforeEach(() => {
        vi.mocked(fetchData).mockReset();
    });

    it('uses the dedicated support-admin search API and preserves live 2FA status', async () => {
        vi.mocked(fetchData).mockResolvedValue({
            items: [
                {
                    id: 'gsa-1',
                    firstname: 'Sam',
                    lastname: 'Support',
                    username: 'sam.support',
                    email: 'sam@example.org',
                    secondFactorStatus: 'PENDING_2FA',
                },
            ],
            total: 1,
        } as never);

        const { result } = renderHook(() => useGlobalSupportAdminsData({ search: 'sam', current: 2, pageSize: 20 }), {
            wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(fetchData).toHaveBeenCalledWith(
            expect.objectContaining({
                url: expect.stringContaining('/service/useradmin/supportadmins/search?query=sam&page=2&perPage=20'),
            }),
        );
        expect(result.current.data).toEqual({
            data: [expect.objectContaining({ id: 'gsa-1', secondFactorStatus: 'PENDING_2FA' })],
            total: 1,
        });
    });
});
