import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TenantAdminData } from '../types/TenantAdminData';

const fetchData = vi.hoisted(() => vi.fn());
const stored = vi.hoisted(() => ({
    id: 7,
    name: 'Caritas Musterstadt',
    subdomain: 'musterstadt',
    licensing: { allowedNumberOfUsers: 5 },
    settings: { featureStatisticsEnabled: true, smtp: { enabled: true } },
}));

vi.mock('../api/fetchData', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../api/fetchData')>()),
    fetchData,
}));
vi.mock('./useSingleTenantData', () => ({ useSingleTenantData: () => ({ data: stored }) }));

// eslint-disable-next-line import/first
import { useAddOrUpdateTenant } from './useAddOrUpdateTenant.hook';

const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
);

const savedBody = async (formData: Record<string, unknown>) => {
    const { result } = renderHook(() => useAddOrUpdateTenant({ id: '7' }), { wrapper });
    result.current.mutate(formData as unknown as TenantAdminData);
    await waitFor(() => expect(fetchData).toHaveBeenCalled());
    return JSON.parse(fetchData.mock.calls[0][0].bodyData);
};

describe('saving Trägerinformationen', () => {
    beforeEach(() => {
        fetchData.mockReset();
        fetchData.mockResolvedValue(stored);
    });

    const addressChange = { name: stored.name, address: 'Neue Straße 2', licensing: stored.licensing };

    it('sends the stored settings along with an address change', async () => {
        const body = await savedBody(addressChange);

        expect(body.address).toBe('Neue Straße 2');
        expect(body.settings).toEqual(stored.settings);
    });

    it('keeps the stored settings when the form sends an empty settings block', async () => {
        const body = await savedBody({ ...addressChange, settings: {} });

        expect(body.settings).toEqual(stored.settings);
    });
});
