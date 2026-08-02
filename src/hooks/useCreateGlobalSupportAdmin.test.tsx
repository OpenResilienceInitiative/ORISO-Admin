import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../api/fetchData', () => ({
    fetchData: vi.fn(),
    FETCH_METHODS: { POST: 'POST' },
    FETCH_SUCCESS: { CONTENT: 'CONTENT' },
    FETCH_ERRORS: {
        BAD_REQUEST_WITH_RESPONSE: 'BAD_REQUEST_WITH_RESPONSE',
        CONFLICT_WITH_RESPONSE: 'CONFLICT_WITH_RESPONSE',
        CATCH_ALL: 'CATCH_ALL',
    },
}));

import { fetchData } from '../api/fetchData';
import { useCreateGlobalSupportAdmin } from './useCreateGlobalSupportAdmin';

describe('useCreateGlobalSupportAdmin', () => {
    it('creates only through the dedicated support-admin endpoint', async () => {
        vi.mocked(fetchData).mockResolvedValue({ id: 'gsa-1' } as never);
        const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <QueryClientProvider client={client}>{children}</QueryClientProvider>
        );
        const { result } = renderHook(() => useCreateGlobalSupportAdmin(), { wrapper });

        act(() => {
            result.current.mutate({
                firstname: 'Sam',
                lastname: 'Support',
                email: 'sam@example.org',
                username: ' sam.support ',
                password: ' secret123 ',
            });
        });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(fetchData).toHaveBeenCalledWith(
            expect.objectContaining({
                url: expect.stringContaining('/service/useradmin/supportadmins'),
                method: 'POST',
                bodyData: JSON.stringify({
                    firstname: 'Sam',
                    lastname: 'Support',
                    email: 'sam@example.org',
                    username: 'sam.support',
                    password: 'secret123',
                }),
            }),
        );
    });
});
