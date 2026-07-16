import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('../api/tenant/getSingleTenantData', () => ({
    getSingleTenantData: vi.fn(),
}));

import { useTenantAdminDataMutation } from './useTenantAdminDataMutation.hook';
import { getSingleTenantData } from '../api/tenant/getSingleTenantData';
import { TenantAdminData } from '../types/TenantAdminData';

const getSingleTenantDataMock = vi.mocked(getSingleTenantData);

const seedTenantAdminData: TenantAdminData = {
    id: 1,
    name: 'Demo tenant',
    isSuperAdmin: false,
    userRoles: [],
    adminEmails: [],
    settings: { featureAnonymousChatEnabled: true },
    theming: {
        logo: '',
        favicon: '',
        primaryColor: '#000000',
        secondaryColor: '#ffffff',
    },
    content: {
        impressum: {},
        privacy: {},
        termsAndConditions: {},
        claim: {},
        confirmTermsAndConditions: false,
        confirmPrivacy: false,
    },
};

const createWrapper = () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
};

beforeEach(() => getSingleTenantDataMock.mockReset());

describe('useTenantAdminDataMutation', () => {
    it('does not prefetch tenant admin data when prefetchTenantAdminData is false', async () => {
        renderHook(
            () =>
                useTenantAdminDataMutation({
                    id: '1',
                    seedTenantAdminData,
                    prefetchTenantAdminData: false,
                }),
            { wrapper: createWrapper() },
        );

        await waitFor(() => expect(getSingleTenantDataMock).not.toHaveBeenCalled(), { timeout: 100 });
    });
});
