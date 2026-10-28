import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vite-plus/test';
import { hasAgencyConsultants } from '../api/agency/getAgencyConsultants';
import { useAgencyHasConsultants } from './useAgencyHasConsultants';

vi.mock('../api/agency/getAgencyConsultants', () => ({ hasAgencyConsultants: vi.fn() }));

const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        {children}
    </QueryClientProvider>
);

describe('saved agency consultant existence', () => {
    it.each([undefined, '', 'add'])('does not request a create/unsaved agency (%s), even with enabled:true', (id) => {
        vi.mocked(hasAgencyConsultants).mockClear();
        const { result } = renderHook(() => useAgencyHasConsultants({ id, enabled: true }), { wrapper });
        expect(result.current.fetchStatus).toBe('idle');
        expect(hasAgencyConsultants).not.toHaveBeenCalled();
    });

    it('queries the actual saved agency', async () => {
        vi.mocked(hasAgencyConsultants).mockResolvedValue(false);
        const { result } = renderHook(() => useAgencyHasConsultants({ id: '101' }), { wrapper });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(hasAgencyConsultants).toHaveBeenCalledWith('101');
    });
});
