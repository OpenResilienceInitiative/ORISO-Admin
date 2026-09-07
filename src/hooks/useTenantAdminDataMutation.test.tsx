import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fetchData } from '../api/fetchData';
import { TENANT_QUERY_KEY } from './useSingleTenantData';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('../api/fetchData', () => ({ fetchData: vi.fn(), FETCH_METHODS: { PUT: 'PUT' } }));

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

beforeEach(() => {
    getSingleTenantDataMock.mockReset();
    vi.mocked(fetchData).mockReset();
});

describe('useTenantAdminDataMutation', () => {
    it('omits unchanged null licensing from an SMTP update while retaining it in cache', async () => {
        const seed = { ...seedTenantAdminData, licensing: { allowedNumberOfUsers: null } };
        const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <QueryClientProvider client={client}>{children}</QueryClientProvider>
        );
        vi.mocked(fetchData).mockResolvedValue(seed);
        const { result } = renderHook(
            () =>
                useTenantAdminDataMutation({
                    id: '40',
                    seedTenantAdminData: seed,
                    prefetchTenantAdminData: false,
                }),
            { wrapper },
        );
        const smtp = {
            enabled: true,
            host: 'smtp.example.test',
            port: 587,
            secure: false,
            username: 'synthetic@example.test',
            password: 'SYNTHETIC-TEST-PASSWORD',
            from: 'synthetic@example.test',
        };
        await result.current.mutateAsync({ settings: { featureSystemNotificationEmailsEnabled: true, smtp } });
        const request = vi.mocked(fetchData).mock.calls[0][0];
        expect(request.url).toMatch(/tenantadmin\/40$/);
        expect(JSON.parse(request.bodyData)).not.toHaveProperty('licensing');
        expect(JSON.parse(request.bodyData).settings.featureSystemNotificationEmailsEnabled).toBe(true);
        expect(JSON.parse(request.bodyData).settings.smtp).toEqual(smtp);
        expect(client.getQueryData<TenantAdminData>([TENANT_QUERY_KEY, 40])?.licensing).toEqual({
            allowedNumberOfUsers: null,
        });
        expect(seed.licensing).toEqual({ allowedNumberOfUsers: null });
    });

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
