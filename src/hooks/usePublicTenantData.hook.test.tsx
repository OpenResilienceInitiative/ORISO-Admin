import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePublicTenantData } from './usePublicTenantData.hook';
import getPublicTenantData, { getPublicTenantDataById } from '../api/tenant/getPublicTenantData';

vi.mock('../api/tenant/getPublicTenantData', () => ({
    default: vi.fn(),
    getPublicTenantDataById: vi.fn(),
}));
vi.mock('../context/useAppConfig', () => ({
    useAppConfigContext: () => ({
        settings: {
            multitenancyWithSingleDomainEnabled: true,
            mainTenantSubdomainForSingleDomainMultitenancy: 'main2',
        },
    }),
}));
vi.mock('../utils/getLocationVariables', () => ({ default: () => ({ subdomain: 'edited1' }) }));
const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        {children}
    </QueryClientProvider>
);
afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});
describe('public tenant identity routing', () => {
    it('reads the edited tenant effective platform identity instead of the single-domain main tenant', async () => {
        vi.mocked(getPublicTenantData).mockResolvedValue({ id: 2, theming: { assistantName: 'Main helper' } });
        vi.mocked(getPublicTenantDataById).mockResolvedValue({ id: 1, theming: { assistantName: 'Platform helper' } });
        const { result } = renderHook(() => usePublicTenantData('1'), { wrapper });
        await waitFor(() => expect(result.current.data?.theming?.assistantName).toBe('Platform helper'));
        expect(getPublicTenantDataById).toHaveBeenCalledWith('1');
        expect(getPublicTenantData).not.toHaveBeenCalled();
    });
    it('preserves the original main-slug route for consumers without an edited tenant id', async () => {
        vi.mocked(getPublicTenantData).mockResolvedValue({ id: 2, theming: { assistantName: 'Main helper' } });
        const { result } = renderHook(() => usePublicTenantData(), { wrapper });
        await waitFor(() => expect(result.current.data?.theming?.assistantName).toBe('Main helper'));
        expect(getPublicTenantDataById).not.toHaveBeenCalled();
    });
    it('does not fabricate an inherited identity after an effective read failure', async () => {
        vi.mocked(getPublicTenantDataById).mockRejectedValue(new Error('Unavailable'));
        const { result } = renderHook(() => usePublicTenantData('1'), { wrapper });
        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.data?.theming).toBeUndefined();
        expect(result.current.data?.id).toBeUndefined();
    });
    it('does not request inherited identity for platform tenant zero', () => {
        renderHook(() => usePublicTenantData('0'), { wrapper });
        expect(getPublicTenantDataById).not.toHaveBeenCalled();
    });
});
