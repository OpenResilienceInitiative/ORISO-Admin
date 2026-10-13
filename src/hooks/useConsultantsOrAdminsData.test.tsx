import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TypeOfUser } from '../enums/TypeOfUser';

vi.mock('../utils/fetchUserSearchWithSortFallback', () => ({
    fetchUserSearchWithSortFallback: vi.fn(),
}));

import { fetchUserSearchWithSortFallback } from '../utils/fetchUserSearchWithSortFallback';
import { useConsultantsOrAdminsData } from './useConsultantsOrAdminsData';

const fetchMock = vi.mocked(fetchUserSearchWithSortFallback);

const createWrapper = () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
};

const renderForType = async (typeOfUser: TypeOfUser) => {
    const { result } = renderHook(() => useConsultantsOrAdminsData({ typeOfUser }), {
        wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
};

describe('useConsultantsOrAdminsData', () => {
    beforeEach(() => {
        fetchMock.mockReset();
        fetchMock.mockResolvedValue({ data: [], total: 0 });
    });

    it('searches consultants via the consultants search endpoint', async () => {
        await renderForType(TypeOfUser.Consultants);

        expect(fetchMock).toHaveBeenCalledWith(
            expect.objectContaining({ url: expect.stringContaining('/service/users/consultants/search') }),
        );
    });

    it('searches agency admins via the agency-admins search endpoint', async () => {
        await renderForType(TypeOfUser.AgencyAdmins);

        expect(fetchMock).toHaveBeenCalledWith(
            expect.objectContaining({ url: expect.stringContaining('/service/useradmin/agencyadmins/search') }),
        );
    });

    it('searches tenant admins via the tenant-admins search endpoint, not the agency-admins one', async () => {
        await renderForType(TypeOfUser.TenantAdmins);

        expect(fetchMock).toHaveBeenCalledWith(
            expect.objectContaining({ url: expect.stringContaining('/service/useradmin/tenantadmins/search') }),
        );
    });

    it('narrows consultants to a Träger and several centres', async () => {
        const { result } = renderHook(
            () =>
                useConsultantsOrAdminsData({
                    typeOfUser: TypeOfUser.Consultants,
                    filters: { tenantId: '3', agencyIds: ['101', '102'] },
                }),
            { wrapper: createWrapper() },
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        const { url } = fetchMock.mock.calls[0][0];
        expect(new URL(url, 'https://example.org').searchParams.get('tenantId')).toBe('3');
        expect(new URL(url, 'https://example.org').searchParams.get('agencyId')).toBe('101,102');
    });
});
