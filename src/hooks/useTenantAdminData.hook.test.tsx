import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TenantData } from '../types/tenant';

vi.mock('../api/fetchData', () => ({
    FETCH_METHODS: { GET: 'GET' },
    fetchData: vi.fn(),
}));

vi.mock('../appConfig', () => ({
    tenantAdminEndpoint: '/service/tenantadmin',
}));

vi.mock('./useTenantData.hook', () => ({
    TENANT_DATA_KEY: 'tenant-data',
    useTenantData: vi.fn(),
}));

import { fetchData } from '../api/fetchData';
import { useTenantData } from './useTenantData.hook';
import { useTenantAdminData } from './useTenantAdminData.hook';

const fetchDataMock = vi.mocked(fetchData);
const useTenantDataMock = vi.mocked(useTenantData);

const currentTenant = {
    id: 1,
    name: 'Current tenant',
    isSuperAdmin: true,
    userRoles: [],
    settings: { activeLanguages: ['de', 'en'] },
    theming: {
        logo: 'logo.svg',
        favicon: 'favicon.ico',
        primaryColor: '#112233',
        secondaryColor: null,
    },
    content: {
        impressum: '<p>Impressum</p>',
        privacy: '<p>Privacy</p>',
        termsAndConditions: null,
        claim: 'Claim',
    },
} as TenantData;

const createWrapper = () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
};

beforeEach(() => {
    fetchDataMock.mockReset();
    useTenantDataMock.mockReset();
    useTenantDataMock.mockReturnValue({
        data: currentTenant,
        isLoading: false,
    } as never);
});

describe('useTenantAdminData', () => {
    it('does not call GET /service/tenantadmin when /service/tenant already provides tenant data', async () => {
        const { result } = renderHook(() => useTenantAdminData(), { wrapper: createWrapper() });

        await waitFor(() => expect(result.current.data?.id).toBe(1));

        expect(fetchDataMock).not.toHaveBeenCalled();
        expect(result.current.data?.settings?.activeLanguages).toEqual(['de', 'en']);
        expect(result.current.data?.content?.impressum?.de).toBe('<p>Impressum</p>');
    });

    it('does not fetch when tenant id is still unknown', async () => {
        useTenantDataMock.mockReturnValue({ data: undefined, isLoading: true } as never);

        renderHook(() => useTenantAdminData(), { wrapper: createWrapper() });

        await waitFor(() => expect(fetchDataMock).not.toHaveBeenCalled(), { timeout: 100 });
    });
});
