import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { FETCH_ERRORS } from '../../api/fetchData';
import type { TutorialStatisticsResponse } from '../../api/statistic/getTutorialStatistics';
import { useTutorialStatistics } from './useTutorialStatistics.hook';

const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        {children}
    </QueryClientProvider>
);

const response: TutorialStatisticsResponse = {
    generatedAt: '2026-07-19T10:00:00Z',
    scope: 'TENANT',
    tenants: [],
};

describe('useTutorialStatistics', () => {
    it('exposes the loaded response through the standard query layer', async () => {
        const { result } = renderHook(() => useTutorialStatistics(() => Promise.resolve(response)), { wrapper });

        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.response).toEqual(response);
        expect(result.current.isForbidden).toBe(false);
        expect(result.current.isError).toBe(false);
    });

    it('separates forbidden from generic errors', async () => {
        const { result } = renderHook(
            () => useTutorialStatistics(() => Promise.reject(new Error(FETCH_ERRORS.FORBIDDEN))),
            { wrapper },
        );

        await waitFor(() => expect(result.current.isForbidden).toBe(true));
        expect(result.current.isError).toBe(false);
    });

    it('reports a generic error state for other failures', async () => {
        const { result } = renderHook(
            () => useTutorialStatistics(() => Promise.reject(new Error('API call error: 500'))),
            { wrapper },
        );

        await waitFor(() => expect(result.current.isError).toBe(true));
        expect(result.current.isForbidden).toBe(false);
    });
});
