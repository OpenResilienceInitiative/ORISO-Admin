import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('../../api/tenant/getSingleTenantData', () => ({ getSingleTenantData: vi.fn() }));
vi.mock('../../api/tenant/getPublicTenantData', () => ({ default: vi.fn() }));
vi.mock('../../api/tenant/getTenantData', () => ({ default: vi.fn() }));
vi.mock('../../api/fetchData', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../../api/fetchData')>()),
    fetchData: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../../hooks/useDpaStatus.hook', () => ({ useDpaStatus: () => ({ data: undefined }) }));
vi.mock('../../context/useAppConfig', () => ({
    useAppConfigContext: () => ({ settings: { multitenancyWithSingleDomainEnabled: false } }),
}));

import { getSingleTenantData } from '../../api/tenant/getSingleTenantData';
import { fetchData } from '../../api/fetchData';
import { useHomeFacts, type HomeFactAccess } from './useHomeFacts';

const getSingleTenantDataMock = vi.mocked(getSingleTenantData);
const fetchDataMock = vi.mocked(fetchData);

const TENANT_ADMIN: HomeFactAccess = {
    role: 'tenant',
    tenantId: 7,
    canReadTenants: false,
    canReadAgencies: false,
    canReadConsultants: false,
    canInviteTenants: false,
    canInviteCounsellors: false,
};

const tenantRecord = (claim: string) => ({
    id: 7,
    name: 'Caritas Süd',
    content: { claim },
    theming: { logo: 'logo.png' },
    settings: {},
});

describe('useHomeFacts', () => {
    beforeEach(() => getSingleTenantDataMock.mockReset());

    it('re-reads the own tenant on the next Home visit, so a settings save shows up at once', async () => {
        const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <QueryClientProvider client={client}>{children}</QueryClientProvider>
        );

        // First visit: the claim is still missing, so the appearance step is open.
        getSingleTenantDataMock.mockResolvedValue(tenantRecord('') as never);
        const first = renderHook(() => useHomeFacts(TENANT_ADMIN), { wrapper });
        await waitFor(() => expect(first.result.current.ownTenant?.appearanceComplete).toBe(false));
        first.unmount();

        // The admin saves a claim in the settings and comes straight back (well within a minute).
        getSingleTenantDataMock.mockResolvedValue(tenantRecord('Wir sind für Sie da') as never);
        const second = renderHook(() => useHomeFacts(TENANT_ADMIN), { wrapper });
        await waitFor(() => expect(second.result.current.ownTenant?.appearanceComplete).toBe(true));
        expect(getSingleTenantDataMock).toHaveBeenCalledTimes(2);
    });

    it('re-reads the centres on the next Home visit, so completing a centre shows up at once', async () => {
        const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <QueryClientProvider client={client}>{children}</QueryClientProvider>
        );
        const AGENCY_ADMIN: HomeFactAccess = { ...TENANT_ADMIN, role: 'agency', canReadAgencies: true };
        const page = (postcode: string) => ({ _embedded: [{ _embedded: { id: 1, postcode } }], total: 1 });

        // First visit: no postcode yet, so "complete your centre" is open.
        fetchDataMock.mockResolvedValue(page('') as never);
        const first = renderHook(() => useHomeFacts(AGENCY_ADMIN), { wrapper });
        await waitFor(() => expect(first.result.current.agencyComplete).toBe(false));
        first.unmount();

        // The admin adds the postcode in the agency editor and comes straight back.
        fetchDataMock.mockResolvedValue(page('20095') as never);
        const second = renderHook(() => useHomeFacts(AGENCY_ADMIN), { wrapper });
        await waitFor(() => expect(second.result.current.agencyComplete).toBe(true));
    });
});
