import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TenantData } from '../types/tenant';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('../api/tenant/getSingleTenantData', () => ({
    getSingleTenantData: vi.fn(),
}));

vi.mock('./useTenantData.hook', () => ({
    TENANT_DATA_KEY: 'tenant-data',
    useTenantData: vi.fn(),
}));

import { getSingleTenantData } from '../api/tenant/getSingleTenantData';
import { useTenantData } from './useTenantData.hook';
import { useTenantAppearanceFormData } from './useTenantAppearanceFormData';

const getSingleTenantDataMock = vi.mocked(getSingleTenantData);
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
        accent: '#445566',
    },
    content: {
        impressum: null,
        privacy: null,
        termsAndConditions: null,
        claim: 'Claim DE',
    },
} as TenantData;

const createWrapper = () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
};

beforeEach(() => {
    getSingleTenantDataMock.mockReset();
    useTenantDataMock.mockReset();
    useTenantDataMock.mockReturnValue({
        data: currentTenant,
        isLoading: false,
    } as never);
});

describe('useTenantAppearanceFormData', () => {
    it('does not call GET /service/tenantadmin when editing the current tenant', async () => {
        const { result } = renderHook(() => useTenantAppearanceFormData('1'), { wrapper: createWrapper() });

        await waitFor(() => expect(result.current.data?.name).toBe('Current tenant'));

        expect(getSingleTenantDataMock).not.toHaveBeenCalled();
        expect(result.current.data?.theming?.logo).toBe('logo.svg');
        expect(result.current.data?.content?.claim?.de).toBe('Claim DE');
    });

    it('still fetches tenantadmin data when editing a different tenant id', async () => {
        getSingleTenantDataMock.mockResolvedValue({
            id: 5,
            name: 'Other tenant',
            theming: { logo: 'other.svg', favicon: '', primaryColor: '#000' },
        } as never);

        const { result } = renderHook(() => useTenantAppearanceFormData('5'), { wrapper: createWrapper() });

        await waitFor(() => expect(result.current.data?.name).toBe('Other tenant'));

        expect(getSingleTenantDataMock).toHaveBeenCalledWith('5');
    });
});
