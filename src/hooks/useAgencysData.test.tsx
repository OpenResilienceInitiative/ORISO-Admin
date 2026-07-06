import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('../api/agency/getAgencyData', () => ({
    default: vi.fn(),
}));

import { useAgenciesData } from './useAgencysData';
import getAgencyData from '../api/agency/getAgencyData';

const getAgencyDataMock = vi.mocked(getAgencyData);

const createWrapper = () => {
    const client = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
            },
        },
    });
    return ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
};

beforeEach(() => getAgencyDataMock.mockReset());

describe('useAgenciesData', () => {
    it('builds the query key from table state', async () => {
        getAgencyDataMock.mockResolvedValue({ total: 0, data: [] });

        const { result } = renderHook(
            () => useAgenciesData({ current: 3, pageSize: 25, search: 'Berlin', sortBy: 'CITY', order: 'DESC' }),
            { wrapper: createWrapper() },
        );

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(getAgencyDataMock).toHaveBeenCalledWith({
            current: 3,
            pageSize: 25,
            search: 'Berlin',
            sortBy: 'CITY',
            order: 'DESC',
        });
    });
});
