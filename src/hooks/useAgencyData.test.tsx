import { QueryClient, QueryClientProvider, type Query } from '@tanstack/react-query';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import getAgencyDataById from '../api/agency/getAgencyById';
import type { AgencyData } from '../types/agency';
import { useAgencyData } from './useAgencyData';

vi.mock('../api/agency/getAgencyById', () => ({ default: vi.fn() }));

const clients: QueryClient[] = [];
const fixture = () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    clients.push(client);
    const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    return { client, wrapper };
};
const stored = { id: '101', name: 'Saved agency', tenantId: 7 };
beforeEach(() => {
    vi.mocked(getAgencyDataById).mockReset();
    vi.mocked(getAgencyDataById).mockResolvedValue({ _embedded: stored });
});
afterEach(() => {
    cleanup();
    clients.forEach((client) => client.clear());
    clients.length = 0;
});

describe('agency data request eligibility', () => {
    it.each(
        [undefined, '', 'add'].flatMap((id) => [
            { id, callable: false },
            { id, callable: true },
        ]),
    )('does not request unsaved id=$id even with enabled=true callable=$callable', ({ id, callable }) => {
        const { client, wrapper } = fixture();
        const enabled = vi.fn(() => true);
        const { result } = renderHook(() => useAgencyData({ id, enabled: callable ? enabled : true }), { wrapper });
        expect(result.current.fetchStatus).toBe('idle');
        expect(getAgencyDataById).not.toHaveBeenCalled();
        expect(enabled).not.toHaveBeenCalled();
        expect(client.getQueryData(['AGENCY', id])).toBeUndefined();
    });
    it('queries a saved id by default and extracts its canonical embedded data', async () => {
        const { client, wrapper } = fixture();
        const { result } = renderHook(() => useAgencyData({ id: '101' }), { wrapper });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(getAgencyDataById).toHaveBeenCalledExactlyOnceWith('101');
        expect(result.current.data).toEqual(stored);
        expect(client.getQueryData(['AGENCY', '101'])).toEqual(stored);
    });
    it('honors explicit enabled=false for a saved id', () => {
        const { wrapper } = fixture();
        const { result } = renderHook(() => useAgencyData({ id: '101', enabled: false }), { wrapper });
        expect(result.current.fetchStatus).toBe('idle');
        expect(getAgencyDataById).not.toHaveBeenCalled();
    });
    it.each([true, false])('honors callable enabled=%s with the actual public query argument', async (allowed) => {
        const { client, wrapper } = fixture();
        const enabled = vi.fn((query: Query<AgencyData>) => query.queryKey[1] === '101' && allowed);
        const { result } = renderHook(() => useAgencyData({ id: '101', enabled }), { wrapper });
        if (allowed) {
            await waitFor(() => expect(result.current.isSuccess).toBe(true));
            expect(getAgencyDataById).toHaveBeenCalledExactlyOnceWith('101');
        } else {
            expect(result.current.fetchStatus).toBe('idle');
            expect(getAgencyDataById).not.toHaveBeenCalled();
        }
        expect(enabled).toHaveBeenCalled();
        const query = client.getQueryCache().find({ queryKey: ['AGENCY', '101'], exact: true });
        enabled.mock.calls.forEach(([actual]) => expect(actual).toBe(query));
        expect(query?.queryKey).toEqual(['AGENCY', '101']);
    });
    it('preserves caller select/staleTime and raw query cache data', async () => {
        const { client, wrapper } = fixture();
        const { result } = renderHook(
            () =>
                useAgencyData({
                    id: '101',
                    staleTime: Infinity,
                    select: (agency) => ({ ...agency, name: `Selected ${agency.name}` }),
                }),
            { wrapper },
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data?.name).toBe('Selected Saved agency');
        expect(client.getQueryData(['AGENCY', '101'])).toEqual(stored);
        expect(
            client
                .getQueryCache()
                .find({ queryKey: ['AGENCY', '101'], exact: true })
                ?.isStaleByTime(Infinity),
        ).toBe(false);
    });
});
