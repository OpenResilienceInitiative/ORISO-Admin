import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vite-plus/test';

const api = vi.hoisted(() => ({
    putAgencyContactPerson: vi.fn(),
    putTenantContactPerson: vi.fn(),
    getAgencyContactPerson: vi.fn(),
    getTenantContactPerson: vi.fn(),
}));
vi.mock('../api/contactPerson/contactPersonApi', () => api);

const {
    useAgencyContactPairs,
    useAgencyContactPerson,
    useSaveAgencyContactPerson,
    useSaveTenantContactPerson,
    useTenantContactPerson,
} = await import('./useContactPerson');

const deferred = <T,>() => {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>((done) => {
        resolve = done;
    });
    return { promise, resolve };
};

const wrapperWith = (client: QueryClient) =>
    function Wrapper({ children }: { children: ReactNode }) {
        return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    };

/** ORISO-Admin#1534: a body-less (204) save stays pending until the stored pair is read back. */
describe('contact person save hooks', () => {
    it.each([
        {
            name: 'centre',
            read: api.getAgencyContactPerson,
            write: api.putAgencyContactPerson,
            useRead: () => useAgencyContactPerson(11),
            useSave: () => useSaveAgencyContactPerson(11),
            stored: { agencyId: 11, traegerDefault: {}, effectiveSource: 'OWN' },
        },
        {
            name: 'Träger',
            read: api.getTenantContactPerson,
            write: api.putTenantContactPerson,
            useRead: () => useTenantContactPerson(7),
            useSave: () => useSaveTenantContactPerson(7),
            stored: { tenantId: 7 },
        },
    ])(
        'keeps the $name save pending until the refetch after a 204 is back',
        async ({ read, write, useRead, useSave, stored }) => {
            const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
            read.mockResolvedValueOnce(stored);
            write.mockResolvedValueOnce(new Response(null, { status: 204 }));
            const { result } = renderHook(() => ({ read: useRead(), save: useSave() }), {
                wrapper: wrapperWith(client),
            });
            await waitFor(() => expect(result.current.read.isSuccess).toBe(true));

            const refetch = deferred<unknown>();
            read.mockReturnValueOnce(refetch.promise);
            act(() => result.current.save.mutate({ contactAdminId: 'a-1' }));

            await waitFor(() => expect(read).toHaveBeenCalledTimes(2));
            expect(result.current.save.isPending).toBe(true);

            await act(async () => refetch.resolve(stored));
            await waitFor(() => expect(result.current.save.isPending).toBe(false));
        },
    );
});

describe('useAgencyContactPairs', () => {
    it('treats a centre whose refetch failed as failed, not as its stale cached pair', async () => {
        const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        api.getAgencyContactPerson.mockResolvedValueOnce({ agencyId: 11, traegerDefault: {}, effectiveSource: 'OWN' });
        const { result } = renderHook(() => useAgencyContactPairs([{ id: 11 }]), { wrapper: wrapperWith(client) });
        await waitFor(() => expect(result.current.pairs[11]).toBeDefined());

        api.getAgencyContactPerson.mockRejectedValueOnce(new Error('CATCH_ALL'));
        await act(async () => {
            await client.refetchQueries({ queryKey: ['CONTACT_PERSON', 'AGENCY', 11] });
        });

        await waitFor(() => expect(result.current.failedIds).toEqual([11]));
        expect(result.current.pairs[11]).toBeUndefined();
    });
});
