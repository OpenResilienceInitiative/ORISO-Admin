import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    useCaseHandoverReasonPoliciesData,
    useCaseHandoverReasonPoliciesMutation,
} from './useCaseHandoverReasonPolicies';

// FE#1725 review 8: the rules belong to one Träger; without one nothing goes over the wire.

const fetchStub = vi.fn(async () => Response.json([]));

const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        {children}
    </QueryClientProvider>
);

beforeEach(() => {
    fetchStub.mockClear();
    vi.stubGlobal('fetch', fetchStub);
});

describe('case handover reason policies without a Träger', () => {
    it('never reads, not even on an explicit refetch', async () => {
        const { result } = renderHook(() => useCaseHandoverReasonPoliciesData(undefined), { wrapper });

        await act(async () => {
            await result.current.refetch();
        });

        expect(fetchStub).not.toHaveBeenCalled();
    });

    it('never writes', async () => {
        const { result } = renderHook(() => useCaseHandoverReasonPoliciesMutation(undefined), { wrapper });

        await act(async () => {
            await result.current.mutateAsync([]).catch(() => undefined);
        });

        await waitFor(() => expect(result.current.isError).toBe(true));
        expect(fetchStub).not.toHaveBeenCalled();
    });

    it('names the Träger when there is one', async () => {
        const { result } = renderHook(() => useCaseHandoverReasonPoliciesData(7), { wrapper });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        const request = fetchStub.mock.calls[0][0] as unknown as Request;
        expect(new URL(request.url).searchParams.get('tenantId')).toBe('7');
    });
});
