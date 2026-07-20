import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { FETCH_ERRORS } from '../../api/fetchData';
import getTutorialStatistics, { TutorialStatisticsResponse } from '../../api/statistic/getTutorialStatistics';

let injectedInstanceCounter = 0;

export interface TutorialStatisticsResult {
    response: TutorialStatisticsResponse | undefined;
    isLoading: boolean;
    /** The backend rejected the caller (403) — distinct from a technical failure. */
    isForbidden: boolean;
    isError: boolean;
}

/**
 * Loads the aggregate tutorial statistics through the application's standard
 * query layer (same pattern as useStatisticDashboardData). A 403 is surfaced as
 * `isForbidden` so the UI can render an in-place "no access" state; only other
 * failures count as `isError`. The loader is injectable for tests/Storybook.
 */
export const useTutorialStatistics = (
    loadStatistics: () => Promise<TutorialStatisticsResponse> = getTutorialStatistics,
): TutorialStatisticsResult => {
    // The live app shares one cache entry; injected loaders (tests/Storybook with a
    // shared QueryClient) get an instance-scoped key so scenarios never leak into
    // each other through the cache.
    const [instanceKey] = useState(() => {
        if (loadStatistics === getTutorialStatistics) {
            return 'live';
        }
        injectedInstanceCounter += 1;
        return `injected-${injectedInstanceCounter}`;
    });

    const query = useQuery({
        queryKey: ['ADMIN_STATISTICS_TUTORIALS', instanceKey],
        queryFn: () => loadStatistics(),
        staleTime: 60 * 1000,
        retry: false,
    });

    const isForbidden = query.error instanceof Error && query.error.message === FETCH_ERRORS.FORBIDDEN;

    return {
        response: query.data,
        isLoading: query.isLoading,
        isForbidden,
        isError: query.isError && !isForbidden,
    };
};
